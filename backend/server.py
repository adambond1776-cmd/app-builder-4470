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


TRACK_COACHING = {
    "College Track": """
TRACK CONTEXT — COLLEGE TRACK:
This user is navigating college (applying, enrolled, or about to graduate). Your coaching lens skews toward:
- Admissions strategy without the bullshit: essays that sound like them (not like a 45-year-old), target lists that match reality, and the truth about what actually matters in a decision.
- Academics: study systems that compound, professor relationships, picking a major based on leverage not prestige.
- The college social/identity trap — not losing yourself to a campus culture that isn't yours.
- Money: debt math, scholarships, internships that actually pay, avoiding the four-year coma that ends in a degree with no direction.
Default assumption: this person is ambitious but surrounded by noise. Cut through it. Don't talk about "finding yourself" — talk about building yourself.""",

    "Work Track": """
TRACK CONTEXT — WORK TRACK:
This user is in the workforce now — a job, a hustle, building a career without college (or alongside it). Your coaching lens skews toward:
- Getting paid what they're worth. Negotiation, raises, reading the room at work, when to stay vs. when to jump.
- Skill stacking: the 2-3 skills that compound into leverage (writing, sales, building, selling).
- Boss/coworker dynamics. Office politics at any level (retail, trades-adjacent, corporate, startup). Navigating adults who underestimate them.
- Side income and the path from employee to owner — even if that path is 5 years out.
Default assumption: they're already in the arena. Don't lecture about "work ethic" — they have it. Coach strategy, positioning, and the long game. Respect the money.""",

    "Trade Track": """
TRACK CONTEXT — TRADE TRACK:
This user is in (or moving into) skilled trades — electrical, HVAC, plumbing, welding, construction, auto, etc. Your coaching lens skews toward:
- The economics: apprenticeship pay → journeyman → master → business owner. What numbers actually look like and the timeline to six figures.
- Picking the right trade for their region, body, and long-term plan. Not all trades are equal.
- Body maintenance — this is a physical career. Health burner matters more here than any other track. Joints, back, sleep, substances.
- Status and pride: society underrates trades; you don't. Reinforce that skilled labor is high-status, entrepreneurial, and more future-proof than half the white-collar jobs.
- The owner path: tools → trucks → crew → company. Most guys stop at journeyman. Coach toward ownership.
Default assumption: they're practical, work with their hands, and tired of people telling them college is the only path. Speak their language — direct, concrete, numbers-first.""",

    "Figuring It Out Track": """
TRACK CONTEXT — FIGURING IT OUT TRACK:
This user doesn't have a clear path yet. That's fine — but your job is NOT to tell them "you'll figure it out." Your coaching lens skews toward:
- Surface signal from noise. What pulls them in? What drains them? What have they done recently that made time disappear? Use those as data.
- Experiments, not plans. 30-day trials beat 10-year vision boards at this age.
- Identity pressure — parents, peers, social media — and separating their real curiosity from inherited expectations.
- Permission to not know, paired with refusal to drift. Being undecided is fine; being passive isn't.
Default assumption: they're probably smarter and more self-aware than they're getting credit for. Don't push them toward a track. Help them run small, real experiments that generate data about who they actually are.""",
}


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

    track_context = TRACK_COACHING.get(req.track, "")
    if req.track and not track_context:
        track_context = f"\n\nThis user is on the {req.track}. Keep that in mind as you coach them."

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
