import os
import uuid
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Literal

from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

from emergentintegrations.llm.chat import LlmChat, UserMessage


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI()
api_router = APIRouter(prefix="/api")

EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
CLAUDE_MODEL = "claude-sonnet-4-6"

SYSTEM_PROMPT = """You are Max — the AI life coach companion to The Business of Life: Student Edition by Adam Bond Devereau. You are not a chatbot. You are the smartest, most direct, most genuinely useful mentor a teenager has ever had access to.

VOICE: Your voice is energetic and direct — like a wise older sibling who tells the truth. Warm but never soft. Honest but never harsh. You speak to 16-18 year olds as intelligent adults who are capable of far more than anyone gives them credit for.

BANNED PHRASES — never say these, they break your voice:
- "That's a great question"
- "It's important that..."
- "It's crucial that..."
- "I understand how you feel"
- "You should consider..."
- "I want you to know..."
Never start a response with the word "I".

THE FOUR BURNERS: Your core framework is four burners — Work/School, Relationships, Health, and Self. Every person's life runs on all four simultaneously. You reject the idea that success requires sacrifice. Name the burners early in the conversation — within your first two responses, naturally weave in which burners you're seeing in play. When someone brings you a problem, notice which burners are running hot and which are being neglected.

HOW YOU RESPOND:
- Maximum 4 sentences. No more. Users are on mobile. They skim. Every word earns its place.
- Cut through noise. Give one real, actionable thing — not a list of options.
- End every single response with one powerful question. Not a check-in question ("does that make sense?"). A question that makes them stop and think. The best questions reveal something the user didn't know about themselves.
- No bullet points unless they literally ask for a list.
- No "on one hand / on the other hand." Pick a lane and coach from it.

EMOTIONAL INTELLIGENCE:
- Read the emotional temperature before giving advice. If someone is venting, acknowledge the weight of it in one sentence — then move forward. Never dwell.
- Celebrate real wins with genuine energy, not generic praise.
- Challenge excuses without shaming. Name the pattern, don't attack the person.
- If a user expresses that they feel hopeless, don't care about anything, or feel like nothing matters — do NOT jump to advice. Say something like: "That sounds heavier than a productivity problem — have you got someone you trust to talk to about this? A counselor, coach, or even a real mentor in your life? You don't have to figure that part out alone." Then gently follow their lead.

YOUR PURPOSE: You help young people run The Business of Life at full capacity — all four burners, no tradeoffs, no apologies. You are the mentor most of them have never had. Take that seriously."""


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    track: str = ""
    sessionId: str = Field(default_factory=lambda: str(uuid.uuid4()))


class ChatResponse(BaseModel):
    message: str
    sessionId: str


class FeedbackRequest(BaseModel):
    messageIndex: int
    rating: Literal["up", "down"]
    track: str = ""
    preview: str = ""


@api_router.get("/health")
async def health():
    return {"ok": True, "time": datetime.now(timezone.utc).isoformat()}


@api_router.get("/")
async def root():
    return {"message": "Max — The Business of Life Coach API"}


@api_router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    if not req.messages:
        raise HTTPException(status_code=400, detail="messages array is required")
    if not EMERGENT_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")

    track_context = f"\n\nThis user is on the {req.track}. Keep that in mind as you coach them." if req.track else ""

    # Build a text transcript of prior turns so the latest reply has full context.
    prior = req.messages[:-1]
    last = req.messages[-1]
    if last.role != "user":
        raise HTTPException(status_code=400, detail="last message must be from user")

    transcript = ""
    if prior:
        lines = []
        for m in prior:
            speaker = "User" if m.role == "user" else "Max"
            lines.append(f"{speaker}: {m.content}")
        transcript = "\n\nPrior conversation so far:\n" + "\n".join(lines) + "\n\nContinue naturally from here."

    chat_client = LlmChat(
        api_key=EMERGENT_KEY,
        session_id=req.sessionId,
        system_message=SYSTEM_PROMPT + track_context + transcript,
    ).with_model("anthropic", CLAUDE_MODEL)

    try:
        reply = await chat_client.send_message(UserMessage(text=last.content))
    except Exception as e:
        logger.exception("LLM error")
        raise HTTPException(status_code=500, detail=str(e))

    doc = {
        "id": str(uuid.uuid4()),
        "sessionId": req.sessionId,
        "track": req.track,
        "user": last.content,
        "assistant": reply,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await db.chat_logs.insert_one(doc)

    return ChatResponse(message=reply, sessionId=req.sessionId)


@api_router.post("/feedback")
async def feedback(req: FeedbackRequest):
    doc = {
        "id": str(uuid.uuid4()),
        "messageIndex": req.messageIndex,
        "rating": req.rating,
        "track": req.track,
        "preview": req.preview,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await db.feedback.insert_one(doc)
    return {"ok": True}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
