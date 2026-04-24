import os
import uuid
import logging
from pathlib import Path
from datetime import datetime, timezone, timedelta, date
from typing import List, Literal, Optional

import httpx
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Cookie, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

from emergentintegrations.llm.chat import LlmChat, UserMessage

from config import (
    MAIN_CHAT_MODEL, SUMMARY_MODEL, MAX_REPLY_TOKENS, SUMMARY_MAX_TOKENS,
    SUMMARY_EVERY_N_EXCHANGES, RAW_HISTORY_KEEP, DAILY_MESSAGE_CAP,
    FOUNDING_20_CAP, SESSION_DAYS,
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")

app = FastAPI()
api_router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")

# -----------------------------
# Max system prompt
# -----------------------------
SYSTEM_PROMPT = """You are Max — the AI life coach companion to The Business of Life: Student Edition by Adam Bond Devereau. You are not a chatbot. You are the smartest, most direct, most genuinely useful mentor a young person has ever had access to.

VOICE: Energetic and direct — like a wise older sibling who tells the truth. Warm but never soft. Honest but never harsh. You speak to young people ages 16–23 as intelligent adults capable of far more than anyone gives them credit for.

BANNED PHRASES — never say these:
- "That's a great question"
- "It's important that..."
- "It's crucial that..."
- "I understand how you feel"
- "You should consider..."
- "I want you to know..."
Never start a response with the word "I".

THE FOUR BURNERS — your core framework: Work/School, Relationships, Health, and Self. The Business of Life refutes the classic Four Burners theory: you CAN run all four at optimum by balancing them, intermittently focusing without neglecting, and keeping a baseline under each. When someone brings a problem, notice which burners are running hot, which are cold, and which need a baseline lift.

HOW YOU RESPOND:
- Maximum 4 sentences. Users are on mobile — every word earns its place.
- Cut through noise. Give one real, actionable thing — not a list.
- End every response with ONE powerful question that makes them think — not a check-in question. The best questions reveal something the user didn't know about themselves.
- No bullet points unless asked. Pick a lane, coach from it.

EMOTIONAL INTELLIGENCE:
- Read the temperature before advising. Venting? Acknowledge weight in one sentence, then move.
- Celebrate real wins genuinely, never generically.
- Challenge excuses without shaming. Name the pattern, not the person.
- If a user expresses hopelessness or "nothing matters" — do NOT jump to advice. Say something like: "That sounds heavier than a productivity problem — got someone you trust to talk to? A counselor, coach, or real mentor? You don't have to figure that part out alone." Then follow their lead.

PURPOSE: Help young people run the Business of Life at full capacity — all four burners, no tradeoffs. Take that seriously."""

TRACK_COACHING = {
    "School Track": "This user is on the SCHOOL TRACK (high school → grad school, ages 16-23). Coach: academics that compound, admissions/transitions without bullshit, separating real interest from inherited expectations, early career setup while still enrolled, debt math. They're ambitious but surrounded by noise — cut through it.",
    "Work Track": "This user is on the WORK TRACK — already in the workforce. Coach: getting paid what they're worth, skill stacking, boss/coworker dynamics, side income, the employee-to-owner path. Respect the money. Don't lecture about work ethic — they have it.",
    "Trade Track": "This user is on the TRADE TRACK — skilled trades (electrical, HVAC, plumbing, welding, etc.). Coach: apprenticeship → journeyman → owner economics, picking the right trade, body maintenance (this is physical career), the owner path. Speak direct, numbers-first.",
    "Figuring It Out Track": "This user is on the FIGURING IT OUT TRACK — no clear path yet. Coach: surface signal from noise, experiments over plans, separating real curiosity from inherited expectations. Don't push them toward a track; help them run small real experiments that generate data about who they are.",
}

# -----------------------------
# Models
# -----------------------------
class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    age_confirmed: bool = False
    beta_consent: bool = False
    documentary_interest: Optional[Literal["yes", "maybe", "no"]] = None
    current_track: Optional[str] = None
    memory_card: Optional[str] = None
    exchange_count_since_summary: int = 0
    daily_count: int = 0
    daily_count_date: Optional[str] = None
    founding_20_applied: bool = False
    created_at: datetime


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    track: Optional[str] = None


class ChatResponse(BaseModel):
    message: str
    remaining_today: int
    memory_card: Optional[str] = None


class ProfileUpdate(BaseModel):
    age_confirmed: Optional[bool] = None
    beta_consent: Optional[bool] = None
    documentary_interest: Optional[Literal["yes", "maybe", "no"]] = None
    current_track: Optional[str] = None


class MemoryUpdate(BaseModel):
    memory_card: str


class FoundingApplication(BaseModel):
    goal: str
    why_me: str
    payment_preference: Literal["paid_ok", "free_only", "either"]


class FeedbackRequest(BaseModel):
    messageIndex: int
    rating: Literal["up", "down"]
    track: str = ""
    preview: str = ""


# -----------------------------
# Auth helpers
# -----------------------------
async def get_current_user(
    request: Request,
    session_token: Optional[str] = Cookie(None),
    authorization: Optional[str] = Header(None),
) -> User:
    token = session_token
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")

    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")

    user_doc = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user_doc)


# -----------------------------
# Health
# -----------------------------
@api_router.get("/health")
async def health():
    return {"ok": True, "time": datetime.now(timezone.utc).isoformat()}


# -----------------------------
# Auth routes
# -----------------------------
@api_router.post("/auth/session")
async def auth_session(request: Request, response: Response, x_session_id: Optional[str] = Header(None)):
    # REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    body = await request.json() if request.headers.get("content-length", "0") != "0" else {}
    session_id = x_session_id or body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")

    async with httpx.AsyncClient(timeout=10.0) as hc:
        r = await hc.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id},
        )
        if r.status_code != 200:
            raise HTTPException(status_code=401, detail="Auth provider rejected session")
        data = r.json()

    email = data["email"]
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    now = datetime.now(timezone.utc)

    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": data.get("name", existing["name"]), "picture": data.get("picture")}},
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": data.get("name", ""),
            "picture": data.get("picture"),
            "age_confirmed": False,
            "beta_consent": False,
            "documentary_interest": None,
            "current_track": None,
            "memory_card": None,
            "exchange_count_since_summary": 0,
            "daily_count": 0,
            "daily_count_date": None,
            "founding_20_applied": False,
            "created_at": now.isoformat(),
        })

    session_token = data.get("session_token") or f"sess_{uuid.uuid4().hex}"
    expires_at = now + timedelta(days=SESSION_DAYS)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": now,
    })

    response.set_cookie(
        "session_token", session_token,
        max_age=SESSION_DAYS * 24 * 3600,
        httponly=True, secure=True, samesite="none", path="/",
    )
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if user_doc and isinstance(user_doc.get("created_at"), str):
        user_doc["created_at"] = datetime.fromisoformat(user_doc["created_at"])
    return {"user": user_doc, "session_token": session_token}


from fastapi import Depends


@api_router.get("/auth/me")
async def auth_me_route(user: User = Depends(get_current_user)):
    return user


@api_router.post("/auth/logout")
async def logout(response: Response, session_token: Optional[str] = Cookie(None)):
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


# -----------------------------
# Profile
# -----------------------------
@api_router.patch("/profile")
async def update_profile(upd: ProfileUpdate, user: User = Depends(get_current_user)):
    changes = {k: v for k, v in upd.model_dump().items() if v is not None}
    if changes:
        await db.users.update_one({"user_id": user.user_id}, {"$set": changes})
    doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    return doc


# -----------------------------
# Memory Card
# -----------------------------
@api_router.get("/memory")
async def get_memory(user: User = Depends(get_current_user)):
    return {"memory_card": user.memory_card or ""}


@api_router.put("/memory")
async def update_memory(upd: MemoryUpdate, user: User = Depends(get_current_user)):
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"memory_card": upd.memory_card[:2000], "exchange_count_since_summary": 0}},
    )
    return {"ok": True, "memory_card": upd.memory_card[:2000]}


@api_router.delete("/memory")
async def reset_memory(user: User = Depends(get_current_user)):
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"memory_card": None, "exchange_count_since_summary": 0}},
    )
    return {"ok": True}


async def build_memory_card(user_id: str, existing: Optional[str], recent_turns: List[dict]) -> str:
    """Use Haiku to distill chat turns into a ~200 token Memory Card."""
    convo_text = "\n".join([f"{t['role']}: {t['content']}" for t in recent_turns])
    summary_prompt = (
        "You are Max's memory engine. Distill what you now know about this young person into a compact, structured note "
        "Max can reload in future chats. Keep it under 5 short lines. Focus on: identity (track, goals), current challenges, "
        "commitments made, four-burner status (work/school, relationships, health, self), and any emotional signals worth remembering. "
        "Write in plain-English third person, no fluff."
    )
    if existing:
        summary_prompt += f"\n\nPrior memory:\n{existing}\n\nUpdate it with new info from these turns:"
    else:
        summary_prompt += "\n\nBuild a fresh memory note from these turns:"
    summary_prompt += f"\n\n{convo_text}"

    summarizer = LlmChat(
        api_key=EMERGENT_KEY,
        session_id=f"summary-{user_id}-{uuid.uuid4().hex[:6]}",
        system_message="You write compact memory notes. Max 5 short lines. No preamble.",
    ).with_model("anthropic", SUMMARY_MODEL)

    try:
        new_card = await summarizer.send_message(UserMessage(text=summary_prompt))
        return new_card.strip()[:2000]
    except Exception as e:
        logger.warning(f"Memory summarization failed: {e}")
        return existing or ""


# -----------------------------
# Chat
# -----------------------------
@api_router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, user: User = Depends(get_current_user)):
    if not user.age_confirmed or not user.beta_consent:
        raise HTTPException(status_code=403, detail="Complete signup first")
    if not req.messages:
        raise HTTPException(status_code=400, detail="messages required")
    if not EMERGENT_KEY:
        raise HTTPException(status_code=500, detail="LLM not configured")

    # Daily cap check
    today = date.today().isoformat()
    daily_count = user.daily_count if user.daily_count_date == today else 0
    if daily_count >= DAILY_MESSAGE_CAP:
        raise HTTPException(status_code=429, detail="daily_cap_reached")

    track = req.track or user.current_track or ""
    track_context = TRACK_COACHING.get(track, "")
    memory_context = f"\n\nMAX'S MEMORY OF THIS USER:\n{user.memory_card}\n\nUse this context naturally; don't robotically repeat it." if user.memory_card else ""

    full_system = SYSTEM_PROMPT + ("\n\n" + track_context if track_context else "") + memory_context

    last = req.messages[-1]
    if last.role != "user":
        raise HTTPException(status_code=400, detail="last message must be user")

    # Keep only recent raw turns for context; Memory Card carries the rest
    prior = req.messages[:-1][-(RAW_HISTORY_KEEP * 2):]
    transcript = ""
    if prior:
        lines = [f"{'User' if m.role == 'user' else 'Max'}: {m.content}" for m in prior]
        transcript = "\n\nRECENT CONVERSATION:\n" + "\n".join(lines) + "\n\nContinue naturally."

    chat_client = LlmChat(
        api_key=EMERGENT_KEY,
        session_id=f"chat-{user.user_id}-{uuid.uuid4().hex[:6]}",
        system_message=full_system + transcript,
    ).with_model("anthropic", MAIN_CHAT_MODEL).with_params(max_tokens=MAX_REPLY_TOKENS)

    try:
        reply = await chat_client.send_message(UserMessage(text=last.content))
    except Exception as e:
        logger.exception("Chat LLM error")
        raise HTTPException(status_code=500, detail=str(e))

    # Persist this turn
    await db.chat_logs.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user.user_id,
        "track": track,
        "user": last.content,
        "assistant": reply,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    # Bump counters
    new_count = user.exchange_count_since_summary + 1
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {
            "daily_count": daily_count + 1,
            "daily_count_date": today,
            "exchange_count_since_summary": new_count,
            "current_track": track or user.current_track,
        }},
    )

    # Refresh Memory Card if threshold hit (background-style but awaited for simplicity)
    updated_memory = user.memory_card
    if new_count >= SUMMARY_EVERY_N_EXCHANGES:
        recent_docs = await db.chat_logs.find(
            {"user_id": user.user_id}, {"_id": 0, "user": 1, "assistant": 1}
        ).sort("timestamp", -1).limit(SUMMARY_EVERY_N_EXCHANGES).to_list(SUMMARY_EVERY_N_EXCHANGES)
        recent_turns = []
        for d in reversed(recent_docs):
            recent_turns.append({"role": "user", "content": d["user"]})
            recent_turns.append({"role": "assistant", "content": d["assistant"]})
        updated_memory = await build_memory_card(user.user_id, user.memory_card, recent_turns)
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$set": {"memory_card": updated_memory, "exchange_count_since_summary": 0}},
        )

    return ChatResponse(
        message=reply,
        remaining_today=max(0, DAILY_MESSAGE_CAP - (daily_count + 1)),
        memory_card=updated_memory,
    )


# -----------------------------
# Founding 20 applications
# -----------------------------
@api_router.get("/founding20/status")
async def founding_status(user: User = Depends(get_current_user)):
    total = await db.founding_20_applications.count_documents({})
    spots_left = max(0, FOUNDING_20_CAP * 3 - total)  # allow 3× oversubscription
    app_doc = await db.founding_20_applications.find_one({"user_id": user.user_id}, {"_id": 0})
    return {
        "applied": user.founding_20_applied,
        "application": app_doc,
        "total_applications": total,
        "spots_cap": FOUNDING_20_CAP,
    }


@api_router.post("/founding20/apply")
async def founding_apply(appn: FoundingApplication, user: User = Depends(get_current_user)):
    if user.founding_20_applied:
        raise HTTPException(status_code=400, detail="Already applied")
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user.user_id,
        "email": user.email,
        "name": user.name,
        "track": user.current_track,
        "goal": appn.goal[:500],
        "why_me": appn.why_me[:500],
        "payment_preference": appn.payment_preference,
        "status": "pending",
        "submitted_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.founding_20_applications.insert_one(doc)
    await db.users.update_one({"user_id": user.user_id}, {"$set": {"founding_20_applied": True}})
    return {"ok": True}


# -----------------------------
# Feedback
# -----------------------------
@api_router.post("/feedback")
async def feedback(req: FeedbackRequest, user: User = Depends(get_current_user)):
    await db.feedback.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user.user_id,
        "messageIndex": req.messageIndex,
        "rating": req.rating,
        "track": req.track,
        "preview": req.preview,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    return {"ok": True}


# -----------------------------
# App setup
# -----------------------------
app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown():
    client.close()
