import os
import uuid
import asyncio
import logging
import time
from pathlib import Path
from datetime import datetime, timezone, timedelta, date
from typing import List, Literal, Optional

import httpx
import resend
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Cookie, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

from config import (
    MAIN_CHAT_MODEL, SUMMARY_MODEL, MAX_REPLY_TOKENS, SUMMARY_MAX_TOKENS,
    SUMMARY_EVERY_N_EXCHANGES, RAW_HISTORY_KEEP, DAILY_MESSAGE_CAP,
    FOUNDING_20_CAP, SESSION_DAYS,
    CURRENT_ROUND_NAME, CURRENT_ROUND_DEADLINE,
    CURRENT_ROUND_SPONSOR_NAME, CURRENT_ROUND_SPONSOR_URL,
    PITCH_TEXT_MAX_CHARS, UPVOTE_RATE_LIMIT_PER_IP_PER_DAY, PITCH_ROUND_CAP,
    FAMILY_PLAN_LAUNCH_PRICE, FOUNDING_PARENT_PRICE, FOUNDING_PARENT_CAP,
    INVITE_CODE_EXPIRY_HOURS, FEATURE_POLL_OPTIONS,
    PARENT_CHAT_MODEL, PARENT_SUMMARY_MODEL, PARENT_MAX_REPLY_TOKENS,
    PARENT_SUMMARY_MAX_TOKENS, PARENT_SUMMARY_EVERY_N_EXCHANGES,
    PARENT_RAW_HISTORY_KEEP, PARENT_DAILY_MESSAGE_CAP,
    PARENT_NUDGE_APPROACHING, PARENT_NUDGE_FINAL,
    MILES_BRAND_NAME, MILES_BRAND_SHORT, MILES_CHAT_MODEL, MILES_SUMMARY_MODEL,
    MILES_MAX_REPLY_TOKENS, MILES_SUMMARY_MAX_TOKENS, MILES_SUMMARY_EVERY_N_EXCHANGES,
    MILES_RAW_HISTORY_KEEP, MILES_DAILY_MESSAGE_CAP, MILES_NUDGE_APPROACHING, MILES_NUDGE_FINAL,
    MILES_FOUNDING_PRICE, MILES_LAUNCH_PRICE, MILES_FOUNDING_CAP,
    MILES_VALID_PERSONAS, MILES_VALID_SUBJECTS, MILES_FEATURE_POLL_OPTIONS,
    ENABLE_DOCUMENTARY_INTEREST, ENABLE_FOUNDING_20_APPLICATIONS, ENABLE_MAX_PITCH,
    ENABLE_FAMILY_OS, ENABLE_STRIPE_CHECKOUT, ENABLE_PAYPAL_CHECKOUT,
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

client = AsyncIOMotorClient(
    os.environ["MONGO_URL"],
    serverSelectionTimeoutMS=5000,
    connectTimeoutMS=10000,
    socketTimeoutMS=20000,
    minPoolSize=1,
)
db = client[os.environ["DB_NAME"]]
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN")

_LLM_SYMBOLS = None


def get_llm_symbols():
    """Import the heavy LLM SDK only when chat endpoints actually need it."""
    global _LLM_SYMBOLS
    if _LLM_SYMBOLS is None:
        from emergentintegrations.llm.chat import LlmChat, UserMessage

        _LLM_SYMBOLS = (LlmChat, UserMessage)
    return _LLM_SYMBOLS

# Resend email config (optional — emails silently skip if key missing)
RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
RESEND_FROM_EMAIL = os.environ.get("RESEND_FROM_EMAIL", "onboarding@resend.dev")
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

# Aquidneck book delivery — public asset URL of the PDF
AQUIDNECK_BOOK_URL = "https://customer-assets.emergentagent.com/job_app-builder-4470/artifacts/mo26ulpq_The%20Business%20of%20Life%20SE.pdf"
AQUIDNECK_BOOK_TITLE = "The Business of Life: Student Edition"


async def send_email_async(to_email: str, subject: str, html: str, text_fallback: Optional[str] = None) -> dict:
    """Send a transactional email via Resend. Returns {ok, id|error}.
    Non-blocking (runs Resend's sync SDK in a thread). Never raises — caller decides whether to surface failure."""
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY missing — email NOT sent to %s", to_email)
        return {"ok": False, "error": "RESEND_API_KEY not configured"}
    params = {
        "from": RESEND_FROM_EMAIL,
        "to": [to_email],
        "subject": subject,
        "html": html,
    }
    if text_fallback:
        params["text"] = text_fallback
    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        email_id = result.get("id") if isinstance(result, dict) else None
        logger.info("Resend send OK to=%s id=%s", to_email, email_id)
        return {"ok": True, "id": email_id}
    except Exception as e:
        msg = str(e)
        logger.error("Resend send FAILED to=%s err=%s", to_email, msg)
        return {"ok": False, "error": msg}


def aquidneck_email_html(first_name: str, school_label: str, role_label: str) -> str:
    """Branded HTML email body for Aquidneck book delivery."""
    return f"""<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.06);">
          <tr><td style="background:linear-gradient(135deg,#0ea5e9,#0d9488);padding:32px 28px;color:#ffffff;">
            <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;opacity:0.9;">A free gift from a local Rhode Island author</div>
            <div style="font-size:26px;font-weight:900;line-height:1.15;margin-top:6px;">Hey {first_name} — your free book is ready.</div>
          </td></tr>
          <tr><td style="padding:28px;">
            <p style="margin:0 0 14px 0;font-size:15px;line-height:1.55;color:#334155;">Thanks for claiming your free copy of <strong>The Business of Life: Student Edition</strong>. This is the book I wish I'd had at your age — written for {role_label.lower()}s like you.</p>
            <p style="margin:0 0 22px 0;font-size:15px;line-height:1.55;color:#334155;">Click below to download and start reading this week:</p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 22px auto;">
              <tr><td style="border-radius:999px;background:linear-gradient(135deg,#0ea5e9,#0d9488);">
                <a href="{AQUIDNECK_BOOK_URL}" style="display:inline-block;padding:16px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">📖 Download {AQUIDNECK_BOOK_TITLE}</a>
              </td></tr>
            </table>
            <p style="margin:0 0 14px 0;font-size:13px;line-height:1.6;color:#64748b;">Inside, you'll find <strong>The Four Burners framework</strong> + the <strong>Prompt Level-Up bonus</strong> — ready-to-use AI prompts that help you discover your strengths, explore careers, and build your next steps.</p>
            <div style="margin:24px 0;padding:18px;background:#f0fdfa;border-left:4px solid #0d9488;border-radius:8px;">
              <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#0f766e;margin-bottom:6px;">If the book helps you</div>
              <p style="margin:0;font-size:14px;line-height:1.55;color:#0f172a;">An honest review on Amazon means the world. And if you want to share your level-up journey on camera, head to <a href="https://maxcoach.app/" style="color:#0d9488;font-weight:700;">maxcoach.app</a> — you could be one of the first Rhode Island students featured.</p>
            </div>
            <p style="margin:18px 0 0 0;font-size:13px;line-height:1.55;color:#64748b;">{school_label} student / staff, this one's for you. Reply to this email if you have questions — I read every reply.</p>
            <p style="margin:18px 0 0 0;font-size:13px;line-height:1.55;color:#64748b;">— Adam Bond Devereau<br/><span style="color:#94a3b8;">Hidden Genius Labs LLC</span></p>
          </td></tr>
          <tr><td style="padding:18px 28px;background:#0f172a;color:#94a3b8;font-size:11px;text-align:center;">Made with love for Aquidneck Island. You received this because you claimed your free book at maxcoach.app.</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>"""


SCHOOL_LABELS = {
    "newport_high": "Newport High",
    "middletown_high": "Middletown High",
    "portsmouth_high": "Portsmouth High",
    "other": "Aquidneck Island",
}
ROLE_LABELS = {"junior": "Junior", "senior": "Senior", "teacher_staff": "Teacher / Staff"}

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

THE ACCELERATOR — Adam's chunking methodology: Adam built his career on a method he discovered intuitively long before science caught up — skim massive volumes of material, extract the high-signal chunks, assemble rapid mental models, and look like a domain expert in weeks instead of years. It's now backed by cognitive science (Miller, Ericsson, syntopical reading). When someone is overwhelmed by volume — a class, a job, an industry, a topic — name it as "running the Accelerator on it." Don't lecture the science. Just coach the move: signal over noise, chunks over chapters, patterns over memorization.

THE GENIUS STACK — the AI tooling that automates the Accelerator: NotebookLM (ingest sources, strip duplicates, extract signal), Obsidian (permanent personal vault that compounds forever), Gemini (synthesis + creative output on top of clean source-grounded notes). When relevant — a kid drowning in research, a syllabus they can't crack, a topic they want to master fast — point to the Genius Stack as the implementation layer. Don't pitch it like a product; mention it like a peer who actually uses it.

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
    role: Literal["kid", "parent", "both"] = "kid"
    age_confirmed: bool = False
    beta_consent: bool = False
    documentary_interest: Optional[Literal["yes", "maybe", "no"]] = None
    current_track: Optional[str] = None
    memory_card: Optional[str] = None
    exchange_count_since_summary: int = 0
    daily_count: int = 0
    daily_count_date: Optional[str] = None
    # Parent (Maya) — fully independent counters so a "both"-role user doesn't collide
    parent_memory_card: Optional[str] = None
    parent_exchange_count_since_summary: int = 0
    parent_daily_count: int = 0
    parent_daily_count_date: Optional[str] = None
    # Miles Academy — academic-edge coach; also fully independent counters
    miles_persona: Optional[Literal["ivy", "vance", "drake"]] = None
    miles_memory_card: Optional[str] = None
    miles_exchange_count_since_summary: int = 0
    miles_daily_count: int = 0
    miles_daily_count_date: Optional[str] = None
    miles_documentary_interest: Optional[Literal["yes", "maybe", "no"]] = None
    miles_onboarded_at: Optional[str] = None
    # Phase 1C — Stripe: booster packs (consumed after daily cap) + founding rate locks
    stripe_customer_id: Optional[str] = None
    max_boosters_remaining: int = 0
    parent_boosters_remaining: int = 0
    miles_boosters_remaining: int = 0
    family_founding_locked_until: Optional[str] = None   # ISO date; set by founding_family_lock purchase
    miles_founding_locked_until: Optional[str] = None    # ISO date; set by founding_miles_lock purchase
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


@app.get("/healthz", include_in_schema=False)
async def healthz():
    return {"ok": True, "time": datetime.now(timezone.utc).isoformat()}


@api_router.get("/public-config")
async def public_config():
    """Public flags the frontend reads on boot. Safe — no secrets, no PII."""
    return {
        "enable_stripe_checkout": ENABLE_STRIPE_CHECKOUT,
        "enable_paypal_checkout": ENABLE_PAYPAL_CHECKOUT and bool(PAYPAL_CLIENT_ID and PAYPAL_SECRET),
    }


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
            "role": "kid",
            "age_confirmed": False,
            "beta_consent": False,
            "documentary_interest": None,
            "current_track": None,
            "memory_card": None,
            "exchange_count_since_summary": 0,
            "daily_count": 0,
            "daily_count_date": None,
            # Maya (parent coach) fields
            "parent_memory_card": None,
            "parent_exchange_count_since_summary": 0,
            "parent_daily_count": 0,
            "parent_daily_count_date": None,
            # Miles Academy fields
            "miles_persona": None,
            "miles_memory_card": None,
            "miles_exchange_count_since_summary": 0,
            "miles_daily_count": 0,
            "miles_daily_count_date": None,
            "miles_documentary_interest": None,
            "miles_onboarded_at": None,
            # Stripe / monetization fields
            "stripe_customer_id": None,
            "max_boosters_remaining": 0,
            "parent_boosters_remaining": 0,
            "miles_boosters_remaining": 0,
            "family_founding_locked_until": None,
            "miles_founding_locked_until": None,
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
    LlmChat, UserMessage = get_llm_symbols()
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
    ).with_model("anthropic", SUMMARY_MODEL).with_params(max_tokens=SUMMARY_MAX_TOKENS)

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
    LlmChat, UserMessage = get_llm_symbols()
    if not user.age_confirmed or not user.beta_consent:
        raise HTTPException(status_code=403, detail="Complete signup first")
    if not req.messages:
        raise HTTPException(status_code=400, detail="messages required")
    if not EMERGENT_KEY:
        raise HTTPException(status_code=500, detail="LLM not configured")

    # Daily cap check — Family Plan bundle (linked parent) overrides cap; otherwise boosters pay the overage
    today = date.today().isoformat()
    daily_count = user.daily_count if user.daily_count_date == today else 0
    used_booster = False
    family_plan_active = False

    # Family Plan bundle: if this kid is linked to a parent whose family_founding_locked_until is in the future,
    # the kid gets unlimited Max — no daily cap applies.
    link = await db.family_links.find_one({"kid_user_id": user.user_id}, {"_id": 0})
    if link:
        parent_doc = await db.users.find_one(
            {"user_id": link["parent_user_id"]},
            {"_id": 0, "family_founding_locked_until": 1},
        )
        locked_until = parent_doc.get("family_founding_locked_until") if parent_doc else None
        if locked_until:
            try:
                lu = datetime.fromisoformat(locked_until)
                if lu.tzinfo is None:
                    lu = lu.replace(tzinfo=timezone.utc)
                if lu > datetime.now(timezone.utc):
                    family_plan_active = True
            except Exception:
                pass

    if not family_plan_active and daily_count >= DAILY_MESSAGE_CAP:
        if user.max_boosters_remaining > 0:
            used_booster = True
        else:
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

    # Bump counters (only persist current_track when truthy, never overwrite with empty string).
    # If Family Plan is active, we still track exchange_count_since_summary for memory cards
    # but don't count against the daily cap.
    new_count = user.exchange_count_since_summary + 1
    update_set = {
        "exchange_count_since_summary": new_count,
    }
    if not family_plan_active:
        update_set["daily_count"] = daily_count + 1
        update_set["daily_count_date"] = today
    if used_booster:
        update_set["max_boosters_remaining"] = max(0, user.max_boosters_remaining - 1)
    if track:
        update_set["current_track"] = track
    await db.users.update_one({"user_id": user.user_id}, {"$set": update_set})

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
        remaining_today=9999 if family_plan_active else max(0, DAILY_MESSAGE_CAP - (daily_count + 1)),
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
# Admin (token-protected)
# -----------------------------
from fastapi.responses import PlainTextResponse


def require_admin(x_admin_token: Optional[str] = Header(None)):
    if not ADMIN_TOKEN or x_admin_token != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Admin token required")
    return True


@api_router.get("/admin/env-check")
async def admin_env_check(_: bool = Depends(require_admin)):
    mongo_connected = False
    mongo_latency_ms = None
    started = time.perf_counter()
    try:
        await asyncio.wait_for(db.command("ping"), timeout=5)
        mongo_connected = True
        mongo_latency_ms = round((time.perf_counter() - started) * 1000)
    except Exception:
        mongo_latency_ms = None

    paypal_configured = ENABLE_PAYPAL_CHECKOUT and bool(PAYPAL_CLIENT_ID and PAYPAL_SECRET)
    return {
        "mongo": {
            "connected": mongo_connected,
            "latency_ms": mongo_latency_ms,
        },
        "integrations": {
            "emergent_llm_key": bool(EMERGENT_KEY),
            "admin_token": bool(ADMIN_TOKEN),
            "stripe_api_key": bool(STRIPE_API_KEY),
            "resend": {
                "configured": bool(RESEND_API_KEY and RESEND_FROM_EMAIL),
                "from_email_set": bool(RESEND_FROM_EMAIL),
                "api_key_set": bool(RESEND_API_KEY),
            },
            "paypal": {
                "configured": paypal_configured,
                "env": PAYPAL_ENV,
                "client_id_set": bool(PAYPAL_CLIENT_ID),
                "secret_set": bool(PAYPAL_SECRET),
            },
        },
        "feature_flags": {
            "documentary_interest": ENABLE_DOCUMENTARY_INTEREST,
            "founding_20_applications": ENABLE_FOUNDING_20_APPLICATIONS,
            "max_pitch": ENABLE_MAX_PITCH,
            "family_os": ENABLE_FAMILY_OS,
            "stripe_checkout": ENABLE_STRIPE_CHECKOUT,
            "paypal_checkout": ENABLE_PAYPAL_CHECKOUT,
        },
    }


@api_router.get("/admin/stats")
async def admin_stats(_: bool = Depends(require_admin)):
    users_total = await db.users.count_documents({})
    age_confirmed = await db.users.count_documents({"age_confirmed": True, "beta_consent": True})

    # Track breakdown
    by_track = {}
    async for d in db.users.aggregate([{"$group": {"_id": "$current_track", "count": {"$sum": 1}}}]):
        key = d["_id"] or "not_picked"
        by_track[key] = d["count"]

    # Documentary interest breakdown
    doc_interest = {"yes": 0, "maybe": 0, "no": 0, "not_asked": 0}
    async for d in db.users.aggregate([{"$group": {"_id": "$documentary_interest", "count": {"$sum": 1}}}]):
        key = d["_id"] or "not_asked"
        doc_interest[key] = d["count"]

    # Founding 20
    f20_total = await db.founding_20_applications.count_documents({})
    f20_paid_ok = await db.founding_20_applications.count_documents({"payment_preference": "paid_ok"})
    f20_either = await db.founding_20_applications.count_documents({"payment_preference": "either"})
    f20_free = await db.founding_20_applications.count_documents({"payment_preference": "free_only"})
    f20_pending = await db.founding_20_applications.count_documents({"status": "pending"})

    # Chat activity
    chats_total = await db.chat_logs.count_documents({})
    feedback_up = await db.feedback.count_documents({"rating": "up"})
    feedback_down = await db.feedback.count_documents({"rating": "down"})

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "users": {
            "total": users_total,
            "fully_onboarded": age_confirmed,
            "by_track": by_track,
            "documentary_interest": doc_interest,
        },
        "founding_20": {
            "total_applications": f20_total,
            "spots_cap": FOUNDING_20_CAP,
            "pending_review": f20_pending,
            "paid_ok": f20_paid_ok,
            "either": f20_either,
            "free_only": f20_free,
            "revenue_ready_leads": f20_paid_ok + f20_either,
        },
        "engagement": {
            "total_chat_turns": chats_total,
            "feedback_positive": feedback_up,
            "feedback_negative": feedback_down,
        },
    }


@api_router.get("/admin/founding20/export.csv", response_class=PlainTextResponse)
async def admin_founding_export(_: bool = Depends(require_admin)):
    import csv, io
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["submitted_at", "name", "email", "track", "payment_preference", "status", "goal", "why_me"])
    async for doc in db.founding_20_applications.find({}, {"_id": 0}).sort("submitted_at", 1):
        writer.writerow([
            doc.get("submitted_at", ""), doc.get("name", ""), doc.get("email", ""),
            doc.get("track", ""), doc.get("payment_preference", ""), doc.get("status", ""),
            (doc.get("goal", "") or "").replace("\n", " "),
            (doc.get("why_me", "") or "").replace("\n", " "),
        ])
    return PlainTextResponse(buf.getvalue(), media_type="text/csv", headers={
        "Content-Disposition": 'attachment; filename="founding20_applications.csv"'
    })


# -----------------------------
# Max Pitch — matchmaking coaching funnel
# -----------------------------
import hashlib
import re

def slugify(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s[:40] if s else "pitch"

def ip_hash(ip: str) -> str:
    return hashlib.sha256((ip or "unknown").encode()).hexdigest()[:16]


class PitchSubmit(BaseModel):
    pitch_text: str
    youtube_url: Optional[str] = None


class PitchWaitlistEntry(BaseModel):
    name: str
    email: str
    note: Optional[str] = None


class JudgeFlag(BaseModel):
    interested: bool
    note: Optional[str] = ""


@api_router.get("/pitch/round")
async def pitch_round():
    submission_count = await db.pitch_submissions.count_documents({"round_name": CURRENT_ROUND_NAME})
    cap = PITCH_ROUND_CAP
    return {
        "name": CURRENT_ROUND_NAME,
        "deadline": CURRENT_ROUND_DEADLINE,
        "sponsor_name": CURRENT_ROUND_SPONSOR_NAME,
        "sponsor_url": CURRENT_ROUND_SPONSOR_URL,
        "submission_count": submission_count,
        "cap": cap,
        "spots_left": max(0, cap - submission_count),
        "is_full": submission_count >= cap,
    }


@api_router.post("/pitch/submit")
async def pitch_submit(req: PitchSubmit, user: User = Depends(get_current_user)):
    if not user.age_confirmed or not user.beta_consent:
        raise HTTPException(status_code=403, detail="Complete signup first")
    text = (req.pitch_text or "").strip()
    if len(text) < 80:
        raise HTTPException(status_code=400, detail="Pitch too short (min 80 chars)")
    if len(text) > PITCH_TEXT_MAX_CHARS:
        raise HTTPException(status_code=400, detail=f"Pitch too long (max {PITCH_TEXT_MAX_CHARS} chars)")

    yt = (req.youtube_url or "").strip() or None
    if yt and not re.match(r"^https?://(www\.)?(youtube\.com|youtu\.be)/", yt):
        raise HTTPException(status_code=400, detail="YouTube URL must be a youtube.com or youtu.be link")

    # One submission per user per round
    existing = await db.pitch_submissions.find_one(
        {"user_id": user.user_id, "round_name": CURRENT_ROUND_NAME}, {"_id": 0}
    )
    if existing:
        raise HTTPException(status_code=400, detail="Already submitted for this round")

    # Enforce per-round cap (cost control)
    submission_count = await db.pitch_submissions.count_documents({"round_name": CURRENT_ROUND_NAME})
    if submission_count >= PITCH_ROUND_CAP:
        raise HTTPException(status_code=409, detail="Round is full. Join the waitlist for the next round.")

    base = slugify(user.name or user.email.split("@")[0])
    slug = f"{base}-{uuid.uuid4().hex[:6]}"
    doc = {
        "id": str(uuid.uuid4()),
        "slug": slug,
        "user_id": user.user_id,
        "name": user.name,
        "track": user.current_track,
        "picture": user.picture,
        "pitch_text": text,
        "youtube_url": yt,
        "round_name": CURRENT_ROUND_NAME,
        "upvote_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.pitch_submissions.insert_one(doc)
    return {"ok": True, "slug": slug}


@api_router.post("/pitch/waitlist")
async def pitch_waitlist(body: PitchWaitlistEntry, request: Request):
    """Public waitlist endpoint — used when current round cap is reached."""
    name = (body.name or "").strip()[:120]
    email = (body.email or "").strip().lower()[:200]
    note = (body.note or "").strip()[:1000] or None
    if not name or not email:
        raise HTTPException(status_code=400, detail="Name and email required")
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Valid email required")

    # De-dupe by email + round
    existing = await db.pitch_waitlist.find_one(
        {"email": email, "round_name": CURRENT_ROUND_NAME}, {"_id": 0}
    )
    if existing:
        return {"ok": True, "already_on_waitlist": True, "id": existing["id"]}

    doc = {
        "id": str(uuid.uuid4()),
        "name": name,
        "email": email,
        "note": note,
        "round_name": CURRENT_ROUND_NAME,
        "source_ip": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent", "")[:300] or None,
        "status": "new",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.pitch_waitlist.insert_one(doc)
    return {"ok": True, "already_on_waitlist": False, "id": doc["id"]}


@api_router.get("/admin/pitch/waitlist")
async def admin_pitch_waitlist(_: bool = Depends(require_admin)):
    items = await db.pitch_waitlist.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    by_round = {}
    for it in items:
        r = it.get("round_name") or "unknown"
        by_round[r] = by_round.get(r, 0) + 1
    return {"waitlist": items, "total": len(items), "by_round": by_round}


@api_router.get("/pitch/mine")
async def pitch_mine(user: User = Depends(get_current_user)):
    doc = await db.pitch_submissions.find_one(
        {"user_id": user.user_id, "round_name": CURRENT_ROUND_NAME}, {"_id": 0}
    )
    return doc


@api_router.get("/pitch/feed")
async def pitch_feed():
    cursor = db.pitch_submissions.find(
        {"round_name": CURRENT_ROUND_NAME},
        {"_id": 0, "user_id": 0},
    ).sort("upvote_count", -1).limit(200)
    return {"pitches": await cursor.to_list(200)}


@api_router.get("/pitch/public-stats")
async def pitch_public_stats():
    """Public aggregate stats for the /pitches + /sponsor pages. No PII, safe to expose."""
    pitches = await db.pitch_submissions.find(
        {"round_name": CURRENT_ROUND_NAME}, {"_id": 0, "upvote_count": 1, "track": 1, "youtube_url": 1}
    ).to_list(500)
    total_pitches = len(pitches)
    total_upvotes = sum(p.get("upvote_count", 0) or 0 for p in pitches)
    videos = sum(1 for p in pitches if p.get("youtube_url"))
    tracks = {}
    for p in pitches:
        t = p.get("track") or "Unspecified"
        tracks[t] = tracks.get(t, 0) + 1
    return {
        "round_name": CURRENT_ROUND_NAME,
        "round_deadline": CURRENT_ROUND_DEADLINE,
        "sponsor_name": CURRENT_ROUND_SPONSOR_NAME,
        "sponsor_url": CURRENT_ROUND_SPONSOR_URL,
        "total_pitches": total_pitches,
        "total_upvotes": total_upvotes,
        "total_videos": videos,
        "tracks": [{"track": k, "count": v} for k, v in sorted(tracks.items(), key=lambda x: -x[1])],
    }


@api_router.get("/pitch/{slug}")
async def pitch_detail(slug: str):
    doc = await db.pitch_submissions.find_one({"slug": slug}, {"_id": 0, "user_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Pitch not found")
    return doc


@api_router.post("/pitch/{slug}/upvote")
async def pitch_upvote(slug: str, request: Request, session_token: Optional[str] = Cookie(None), authorization: Optional[str] = Header(None)):
    doc = await db.pitch_submissions.find_one({"slug": slug}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Pitch not found")

    # Detect authed user (optional — don't 401 if not logged in)
    voter_user_id = None
    token = session_token
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
    if token:
        session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
        if session:
            voter_user_id = session.get("user_id")

    ip = request.client.host if request.client else "unknown"
    ip_h = ip_hash(ip)
    today = date.today().isoformat()

    # Dedup: per user_id if authed, else per ip_hash — one vote per pitch per voter
    dedup_filter = {"pitch_slug": slug}
    if voter_user_id:
        dedup_filter["voter_user_id"] = voter_user_id
    else:
        dedup_filter["ip_hash"] = ip_h
        dedup_filter["voter_user_id"] = None

    already = await db.pitch_upvotes.find_one(dedup_filter, {"_id": 0})
    if already:
        return {"ok": True, "already_voted": True, "upvote_count": doc["upvote_count"], "authed": bool(voter_user_id)}

    # Anon rate limit per IP per day
    if not voter_user_id:
        anon_today = await db.pitch_upvotes.count_documents({"ip_hash": ip_h, "voter_user_id": None, "date": today})
        if anon_today >= UPVOTE_RATE_LIMIT_PER_IP_PER_DAY:
            raise HTTPException(status_code=429, detail="Daily vote limit hit. Sign in to keep voting.")

    await db.pitch_upvotes.insert_one({
        "id": str(uuid.uuid4()),
        "pitch_slug": slug,
        "voter_user_id": voter_user_id,
        "ip_hash": ip_h,
        "date": today,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    await db.pitch_submissions.update_one({"slug": slug}, {"$inc": {"upvote_count": 1}})
    new_count = doc["upvote_count"] + 1
    return {"ok": True, "upvote_count": new_count, "authed": bool(voter_user_id)}


@api_router.get("/pitch/{slug}/my-upvote")
async def pitch_my_upvote(slug: str, user: User = Depends(get_current_user)):
    exists = await db.pitch_upvotes.find_one({"pitch_slug": slug, "voter_user_id": user.user_id}, {"_id": 0})
    return {"upvoted": bool(exists)}


# --- Judge endpoints (magic-token based, no auth) ---
async def _get_judge_by_token(token: str):
    if not token:
        raise HTTPException(status_code=401, detail="Judge token required")
    judge = await db.pitch_judges.find_one({"token": token, "active": True}, {"_id": 0})
    if not judge:
        raise HTTPException(status_code=401, detail="Invalid judge token")
    return judge


@api_router.get("/pitch/judge/me")
async def judge_me(token: Optional[str] = None):
    judge = await _get_judge_by_token(token)
    return {"name": judge["name"], "id": judge["id"]}


@api_router.get("/pitch/judge/pitches")
async def judge_pitches(token: Optional[str] = None):
    judge = await _get_judge_by_token(token)
    cursor = db.pitch_submissions.find(
        {"round_name": CURRENT_ROUND_NAME},
        {"_id": 0, "user_id": 0},
    ).sort("upvote_count", -1).limit(500)
    pitches = await cursor.to_list(500)
    flags = await db.pitch_judge_flags.find({"judge_id": judge["id"]}, {"_id": 0}).to_list(500)
    flag_map = {f["pitch_slug"]: f for f in flags}
    for p in pitches:
        f = flag_map.get(p["slug"])
        p["judge_flag"] = {"interested": f["interested"], "note": f.get("note", "")} if f else None
    return {"pitches": pitches, "judge_name": judge["name"]}


@api_router.post("/pitch/judge/flag/{slug}")
async def judge_flag(slug: str, body: JudgeFlag, token: Optional[str] = None):
    judge = await _get_judge_by_token(token)
    doc = await db.pitch_submissions.find_one({"slug": slug}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Pitch not found")
    await db.pitch_judge_flags.update_one(
        {"judge_id": judge["id"], "pitch_slug": slug},
        {"$set": {
            "judge_id": judge["id"],
            "judge_name": judge["name"],
            "pitch_slug": slug,
            "interested": body.interested,
            "note": (body.note or "")[:500],
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return {"ok": True}


# --- Admin: manage judges + view match matrix ---
class JudgeCreate(BaseModel):
    name: str
    email: Optional[str] = None


@api_router.post("/admin/pitch/judges")
async def admin_create_judge(body: JudgeCreate, _: bool = Depends(require_admin)):
    judge_id = f"judge_{uuid.uuid4().hex[:10]}"
    token = f"jt_{uuid.uuid4().hex}{uuid.uuid4().hex[:8]}"
    doc = {
        "id": judge_id, "name": body.name, "email": body.email,
        "token": token, "active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.pitch_judges.insert_one(doc)
    return {"id": judge_id, "name": body.name, "token": token, "magic_link_suffix": f"/judge?token={token}"}


@api_router.get("/admin/pitch/judges")
async def admin_list_judges(_: bool = Depends(require_admin)):
    judges = await db.pitch_judges.find({}, {"_id": 0}).to_list(200)
    return {"judges": judges}


@api_router.delete("/admin/pitch/judges/{judge_id}")
async def admin_deactivate_judge(judge_id: str, _: bool = Depends(require_admin)):
    await db.pitch_judges.update_one({"id": judge_id}, {"$set": {"active": False}})
    return {"ok": True}


@api_router.get("/admin/pitch/matrix")
async def admin_matrix(_: bool = Depends(require_admin)):
    pitches = await db.pitch_submissions.find({"round_name": CURRENT_ROUND_NAME}, {"_id": 0, "user_id": 0}).sort("upvote_count", -1).to_list(500)
    flags = await db.pitch_judge_flags.find({}, {"_id": 0}).to_list(2000)
    by_slug = {}
    for f in flags:
        by_slug.setdefault(f["pitch_slug"], []).append({"judge_name": f["judge_name"], "interested": f["interested"], "note": f.get("note", "")})
    for p in pitches:
        p["judge_flags"] = by_slug.get(p["slug"], [])
        p["interested_count"] = sum(1 for f in p["judge_flags"] if f["interested"])
    return {"round_name": CURRENT_ROUND_NAME, "pitches": pitches}


# -----------------------------
# Family OS — parent role, invite/link flow, dashboard, polls, founding plan
# -----------------------------
import random

MAYA_SYSTEM_PROMPT = """You are Maya — the parent coach companion to The Business of Life: Family Edition by Adam Bond Devereau. You coach parents of young people (teens through their 20s) who want to run their family at full capacity without sacrificing any part of their own life.

VOICE: Warm, direct, unflinching. Like a peer who's been through the weeds of raising kids and refuses to sugarcoat. You talk to parents as intelligent adults doing the hardest job there is — not as experts who have it figured out, not as children who need to be managed. Respectful but never deferential.

BANNED PHRASES — never say these:
- "That's a great question"
- "It's important that..."
- "It's crucial that..."
- "I understand how you feel"
- "You should consider..."
- "I want you to know..."
Never start a response with the word "I".

FRAMEWORK — THE FAMILY BURNERS (Adam's adaptation of the Four Burners for families):
1. STRUCTURE — routines, responsibilities, rules, rhythm of the home
2. CONNECTION — quality time, real conversation, presence, emotional availability
3. RESOURCES — money, time, energy — the finite things you allocate
4. INDIVIDUAL GROWTH — every person in the family (including YOU, the parent) leveling up as an individual

THE THESIS: You don't have to sacrifice a burner. The old wisdom says working parents can't have connection; connected parents can't build wealth. The Business of Life Family Edition rejects that — you run all four at baseline, then rotate focus without neglecting the others. Parenting is NOT sacrifice. It's orchestration.

THE ACCELERATOR — Adam's chunking methodology that runs underneath everything: Adam built a career on the ability to absorb massive volumes of information by chunking it intelligently — extracting high-signal pieces, building rapid mental models, and looking like an expert in a field after weeks of focused study. When a parent feels overwhelmed (a new diagnosis, a school system they don't understand, a college admissions process, a teen subculture they're missing) — coach them to "run the Accelerator" instead of trying to read everything. Strip the noise. Find the chunks that matter. Build the model. The parents who feel like they have to know it all burn out the fastest. The Accelerator is permission to stop drowning in volume and start extracting signal.

THE GENIUS STACK — the AI tooling that automates the Accelerator for parents who don't have hours to read: NotebookLM (drop in 5 articles, 2 podcasts, a YouTube playlist about whatever you're trying to understand — get back the consolidated signal), Obsidian (your permanent family knowledge vault — every kid's IEP, every teacher email, every doctor's note, everything connected and searchable forever), Gemini (synthesize and apply — turn a week of school documents into a 3-bullet plan you can actually act on this weekend). When a parent is drowning in information, point them at the Genius Stack as the practical implementation. Don't sell it; just mention it like a tool you'd hand a friend.

HOW YOU RESPOND:
- Maximum 5 sentences. Parents have a little more patience than teens, but not much. Every word earns its place.
- Give one real, actionable thing — not a list of parenting theories.
- End every response with one sharp question. Not "does that make sense?" — a question that makes the parent see something new about themselves or their kid.
- No bullet points unless asked.
- Don't diagnose the kid. Coach the parent.

EMOTIONAL INTELLIGENCE:
- Parents often arrive exhausted, guilty, or worried. Acknowledge the weight in ONE sentence, then move to action. Don't dwell.
- Celebrate wins with real energy — parents rarely get told they're doing something right.
- Challenge excuses without shame. Name the pattern, not the person.
- If a parent mentions their kid is in crisis (self-harm signals, hopelessness, substances, abuse), do NOT give productivity advice. Say: "This is beyond a parenting rhythm problem. Is your kid safe right now? Have you talked to a professional — a therapist, school counselor, or crisis line?" Then follow their lead. Non-negotiable.

YOUR PURPOSE: Help parents stop running on fumes. Help them see their family as a system they're orchestrating, not a list of fires to put out. Help them raise kids while still becoming the person they want to be themselves."""


class ParentChatRequest(BaseModel):
    messages: List[ChatMessage]


class ParentChatResponse(BaseModel):
    message: str
    remaining_today: int
    parent_memory_card: Optional[str] = None
    limit_state: Literal["normal", "approaching", "final_five", "exhausted"] = "normal"
    nudge: Optional[str] = None


class ParentMemoryUpdate(BaseModel):
    parent_memory_card: str


async def build_parent_memory_card(user_id: str, existing: Optional[str], recent_turns: List[dict]) -> str:
    """Use Haiku to distill Maya chat turns into a ~200 token Parent Memory Card."""
    LlmChat, UserMessage = get_llm_symbols()
    convo_text = "\n".join([f"{t['role']}: {t['content']}" for t in recent_turns])
    summary_prompt = (
        "You are Maya's memory engine. Distill what you now know about this parent into a compact, structured note "
        "Maya can reload in future chats. Keep it under 5 short lines. Focus on: family shape (kids' ages/vibes, co-parenting setup), "
        "the parent's recurring pressures, commitments they made, family-burner status (structure/connection/resources/individual growth), "
        "and emotional signals worth remembering. Write in plain-English third person, no fluff."
    )
    if existing:
        summary_prompt += f"\n\nPrior memory:\n{existing}\n\nUpdate it with new info from these turns:"
    else:
        summary_prompt += "\n\nBuild a fresh memory note from these turns:"
    summary_prompt += f"\n\n{convo_text}"

    summarizer = LlmChat(
        api_key=EMERGENT_KEY,
        session_id=f"parent-summary-{user_id}-{uuid.uuid4().hex[:6]}",
        system_message="You write compact memory notes about a parent. Max 5 short lines. No preamble.",
    ).with_model("anthropic", PARENT_SUMMARY_MODEL).with_params(max_tokens=PARENT_SUMMARY_MAX_TOKENS)

    try:
        new_card = await summarizer.send_message(UserMessage(text=summary_prompt))
        return new_card.strip()[:2000]
    except Exception as e:
        logger.warning(f"Parent memory summarization failed: {e}")
        return existing or ""


PARENT_TRACK_NAMES = {"single": "Single Parent", "co": "Co-Parent", "blended": "Blended Family", "guardian": "Guardian/Other"}


def gen_invite_code() -> str:
    return "".join(str(random.randint(0, 9)) for _ in range(6))


class FamilyInviteCreate(BaseModel):
    pass


class FamilyAcceptInvite(BaseModel):
    code: str
    shares_memory_card: bool = True
    shares_burner_scores: bool = True
    shares_activity: bool = True


class PrivacyUpdate(BaseModel):
    shares_memory_card: Optional[bool] = None
    shares_burner_scores: Optional[bool] = None
    shares_activity: Optional[bool] = None


class FamilyIdea(BaseModel):
    idea: str
    category: Literal["kid_growth", "parent_tools", "family_life", "other"]


class PollVote(BaseModel):
    option_ids: List[str]  # parent can vote for multiple priorities


class FoundingParentSignup(BaseModel):
    agrees_to_founding_terms: bool


def _require_parent(user: User):
    if user.role not in ("parent", "both"):
        raise HTTPException(status_code=403, detail="Parent role required")


def _require_onboarded(user: User):
    if not user.age_confirmed or not user.beta_consent:
        raise HTTPException(status_code=403, detail="Complete onboarding first")


# -----------------------------
# Maya — Parent Coach chat
# -----------------------------
@api_router.post("/family/chat", response_model=ParentChatResponse)
async def family_chat(req: ParentChatRequest, user: User = Depends(get_current_user)):
    LlmChat, UserMessage = get_llm_symbols()
    _require_parent(user)
    _require_onboarded(user)
    if not req.messages:
        raise HTTPException(status_code=400, detail="messages required")
    if not EMERGENT_KEY:
        raise HTTPException(status_code=500, detail="LLM not configured")

    today = date.today().isoformat()
    daily_count = user.parent_daily_count if user.parent_daily_count_date == today else 0
    used_booster = False
    # Family Plan bundle: parent's own founding_lock unlocks unlimited Maya
    family_plan_active = False
    if user.family_founding_locked_until:
        try:
            lu = datetime.fromisoformat(user.family_founding_locked_until)
            if lu.tzinfo is None:
                lu = lu.replace(tzinfo=timezone.utc)
            if lu > datetime.now(timezone.utc):
                family_plan_active = True
        except Exception:
            pass

    if not family_plan_active and daily_count >= PARENT_DAILY_MESSAGE_CAP:
        if user.parent_boosters_remaining > 0:
            used_booster = True
        else:
            raise HTTPException(status_code=429, detail="daily_cap_reached")

    remaining_before = PARENT_DAILY_MESSAGE_CAP - daily_count
    # Maya gets a soft in-response nudge in her own voice when the parent is down to final five.
    # We append it as an instruction to the system prompt so it shows up in *her* tone, not a banner-bot tone.
    nudge_instruction = ""
    if remaining_before <= PARENT_NUDGE_FINAL:
        nudge_instruction = (
            f"\n\nSYSTEM NOTE (not visible to user): This parent has {remaining_before} message(s) left today on the free plan. "
            "After your normal coaching answer, add ONE short, matter-of-fact line — in your own voice — letting them know they're near today's limit "
            f"and that Founding Parents get unlimited sessions at ${FOUNDING_PARENT_PRICE}/mo (locked for a year, launches at ${FAMILY_PLAN_LAUNCH_PRICE}/mo). "
            "Do NOT be salesy. One line. Optional if it breaks the emotional moment — skip it entirely if the parent just disclosed a crisis."
        )

    memory_context = (
        f"\n\nMAYA'S MEMORY OF THIS PARENT:\n{user.parent_memory_card}\n\nUse this context naturally; don't robotically repeat it."
        if user.parent_memory_card else ""
    )
    full_system = MAYA_SYSTEM_PROMPT + memory_context + nudge_instruction

    last = req.messages[-1]
    if last.role != "user":
        raise HTTPException(status_code=400, detail="last message must be user")

    prior = req.messages[:-1][-(PARENT_RAW_HISTORY_KEEP * 2):]
    transcript = ""
    if prior:
        lines = [f"{'Parent' if m.role == 'user' else 'Maya'}: {m.content}" for m in prior]
        transcript = "\n\nRECENT CONVERSATION:\n" + "\n".join(lines) + "\n\nContinue naturally."

    chat_client = LlmChat(
        api_key=EMERGENT_KEY,
        session_id=f"parent-chat-{user.user_id}-{uuid.uuid4().hex[:6]}",
        system_message=full_system + transcript,
    ).with_model("anthropic", PARENT_CHAT_MODEL).with_params(max_tokens=PARENT_MAX_REPLY_TOKENS)

    try:
        reply = await chat_client.send_message(UserMessage(text=last.content))
    except Exception as e:
        logger.exception("Parent chat LLM error")
        raise HTTPException(status_code=500, detail=str(e))

    # Persist this turn (separate collection so kids' chat_logs stay clean)
    await db.parent_chat_logs.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user.user_id,
        "user": last.content,
        "assistant": reply,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    new_exchange = user.parent_exchange_count_since_summary + 1
    new_daily = daily_count + 1
    parent_update = {
        "parent_exchange_count_since_summary": new_exchange,
    }
    if not family_plan_active:
        parent_update["parent_daily_count"] = new_daily
        parent_update["parent_daily_count_date"] = today
    if used_booster:
        parent_update["parent_boosters_remaining"] = max(0, user.parent_boosters_remaining - 1)
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": parent_update},
    )

    updated_memory = user.parent_memory_card
    if new_exchange >= PARENT_SUMMARY_EVERY_N_EXCHANGES:
        recent_docs = await db.parent_chat_logs.find(
            {"user_id": user.user_id}, {"_id": 0, "user": 1, "assistant": 1}
        ).sort("timestamp", -1).limit(PARENT_SUMMARY_EVERY_N_EXCHANGES).to_list(PARENT_SUMMARY_EVERY_N_EXCHANGES)
        recent_turns = []
        for d in reversed(recent_docs):
            recent_turns.append({"role": "user", "content": d["user"]})
            recent_turns.append({"role": "assistant", "content": d["assistant"]})
        updated_memory = await build_parent_memory_card(user.user_id, user.parent_memory_card, recent_turns)
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$set": {"parent_memory_card": updated_memory, "parent_exchange_count_since_summary": 0}},
        )

    remaining_after = 9999 if family_plan_active else max(0, PARENT_DAILY_MESSAGE_CAP - new_daily)
    if remaining_after == 0:
        limit_state = "exhausted"
    elif remaining_after <= PARENT_NUDGE_FINAL:
        limit_state = "final_five"
    elif remaining_after <= PARENT_NUDGE_APPROACHING:
        limit_state = "approaching"
    else:
        limit_state = "normal"

    nudge_banner = None
    if limit_state == "approaching":
        nudge_banner = f"{remaining_after} messages left today."
    elif limit_state == "final_five":
        nudge_banner = f"{remaining_after} left. Founding Parents get unlimited — ${FOUNDING_PARENT_PRICE}/mo locked for a year."

    return ParentChatResponse(
        message=reply,
        remaining_today=remaining_after,
        parent_memory_card=updated_memory,
        limit_state=limit_state,
        nudge=nudge_banner,
    )


@api_router.get("/family/chat/history")
async def family_chat_history(user: User = Depends(get_current_user), limit: int = 40):
    _require_parent(user)
    limit = max(1, min(200, limit))
    docs = await db.parent_chat_logs.find(
        {"user_id": user.user_id}, {"_id": 0, "user": 1, "assistant": 1, "timestamp": 1}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    turns = []
    for d in reversed(docs):
        turns.append({"role": "user", "content": d["user"], "timestamp": d.get("timestamp")})
        turns.append({"role": "assistant", "content": d["assistant"], "timestamp": d.get("timestamp")})
    today = date.today().isoformat()
    daily_count = user.parent_daily_count if user.parent_daily_count_date == today else 0
    return {
        "messages": turns,
        "remaining_today": max(0, PARENT_DAILY_MESSAGE_CAP - daily_count),
        "daily_cap": PARENT_DAILY_MESSAGE_CAP,
    }


@api_router.get("/family/memory")
async def family_get_memory(user: User = Depends(get_current_user)):
    _require_parent(user)
    return {"parent_memory_card": user.parent_memory_card or ""}


@api_router.put("/family/memory")
async def family_update_memory(upd: ParentMemoryUpdate, user: User = Depends(get_current_user)):
    _require_parent(user)
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"parent_memory_card": upd.parent_memory_card[:2000], "parent_exchange_count_since_summary": 0}},
    )
    return {"ok": True, "parent_memory_card": upd.parent_memory_card[:2000]}


@api_router.delete("/family/memory")
async def family_reset_memory(user: User = Depends(get_current_user)):
    _require_parent(user)
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"parent_memory_card": None, "parent_exchange_count_since_summary": 0}},
    )
    return {"ok": True}


@api_router.post("/family/invite")
async def family_create_invite(user: User = Depends(get_current_user)):
    _require_parent(user)
    _require_onboarded(user)
    # One active code at a time; wipe previous
    code = gen_invite_code()
    expires = datetime.now(timezone.utc) + timedelta(hours=INVITE_CODE_EXPIRY_HOURS)
    await db.family_invitations.delete_many({"parent_user_id": user.user_id, "status": "pending"})
    await db.family_invitations.insert_one({
        "id": str(uuid.uuid4()),
        "code": code,
        "parent_user_id": user.user_id,
        "parent_name": user.name,
        "status": "pending",
        "expires_at": expires.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"code": code, "expires_at": expires.isoformat(), "hours_valid": INVITE_CODE_EXPIRY_HOURS}


@api_router.get("/family/invite/current")
async def family_current_invite(user: User = Depends(get_current_user)):
    _require_parent(user)
    doc = await db.family_invitations.find_one(
        {"parent_user_id": user.user_id, "status": "pending"}, {"_id": 0}
    )
    if not doc:
        return {"code": None}
    # Check expiry
    exp = datetime.fromisoformat(doc["expires_at"].replace("Z", "+00:00")) if isinstance(doc["expires_at"], str) else doc["expires_at"]
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        await db.family_invitations.update_one({"id": doc["id"]}, {"$set": {"status": "expired"}})
        return {"code": None}
    return doc


@api_router.post("/family/accept")
async def family_accept_invite(body: FamilyAcceptInvite, user: User = Depends(get_current_user)):
    _require_onboarded(user)
    invite = await db.family_invitations.find_one({"code": body.code, "status": "pending"}, {"_id": 0})
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid or used invite code")
    exp = datetime.fromisoformat(invite["expires_at"].replace("Z", "+00:00")) if isinstance(invite["expires_at"], str) else invite["expires_at"]
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        await db.family_invitations.update_one({"id": invite["id"]}, {"$set": {"status": "expired"}})
        raise HTTPException(status_code=400, detail="Invite code expired")
    if invite["parent_user_id"] == user.user_id:
        raise HTTPException(status_code=400, detail="Can't link to yourself")

    existing = await db.family_links.find_one({"parent_user_id": invite["parent_user_id"], "kid_user_id": user.user_id}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Already linked to this parent")

    await db.family_links.insert_one({
        "id": str(uuid.uuid4()),
        "parent_user_id": invite["parent_user_id"],
        "parent_name": invite["parent_name"],
        "kid_user_id": user.user_id,
        "kid_name": user.name,
        "shares_memory_card": body.shares_memory_card,
        "shares_burner_scores": body.shares_burner_scores,
        "shares_activity": body.shares_activity,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    await db.family_invitations.update_one({"id": invite["id"]}, {"$set": {"status": "accepted", "accepted_by": user.user_id, "accepted_at": datetime.now(timezone.utc).isoformat()}})
    return {"ok": True, "parent_name": invite["parent_name"]}


@api_router.get("/family/my-parent")
async def family_my_parent(user: User = Depends(get_current_user)):
    link = await db.family_links.find_one({"kid_user_id": user.user_id}, {"_id": 0})
    return link


@api_router.patch("/family/privacy")
async def family_update_privacy(body: PrivacyUpdate, user: User = Depends(get_current_user)):
    link = await db.family_links.find_one({"kid_user_id": user.user_id}, {"_id": 0})
    if not link:
        raise HTTPException(status_code=404, detail="Not linked to any parent")
    changes = {k: v for k, v in body.model_dump().items() if v is not None}
    if changes:
        await db.family_links.update_one({"id": link["id"]}, {"$set": changes})
    updated = await db.family_links.find_one({"id": link["id"]}, {"_id": 0})
    return updated


@api_router.delete("/family/unlink")
async def family_unlink(user: User = Depends(get_current_user)):
    # Either side can unlink
    res = await db.family_links.delete_many({"$or": [{"kid_user_id": user.user_id}, {"parent_user_id": user.user_id}]})
    return {"ok": True, "removed": res.deleted_count}


@api_router.get("/family/dashboard")
async def family_dashboard(user: User = Depends(get_current_user)):
    _require_parent(user)
    links = await db.family_links.find({"parent_user_id": user.user_id}, {"_id": 0}).to_list(20)
    kids = []
    for link in links:
        kid = await db.users.find_one({"user_id": link["kid_user_id"]}, {"_id": 0})
        if not kid:
            continue
        today = date.today().isoformat()
        daily = kid.get("daily_count", 0) if kid.get("daily_count_date") == today else 0
        recent_turns = await db.chat_logs.count_documents({
            "user_id": link["kid_user_id"],
            "timestamp": {"$gte": (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()},
        })
        shared = {
            "name": kid.get("name"),
            "picture": kid.get("picture"),
            "track": kid.get("current_track"),
            "linked_at": link.get("created_at"),
            "privacy": {
                "shares_memory_card": link.get("shares_memory_card", True),
                "shares_burner_scores": link.get("shares_burner_scores", True),
                "shares_activity": link.get("shares_activity", True),
            },
        }
        if link.get("shares_memory_card"):
            shared["memory_card"] = kid.get("memory_card") or "Your kid hasn't built a memory with Max yet."
        if link.get("shares_activity"):
            shared["messages_today"] = daily
            shared["messages_last_7_days"] = recent_turns
        kids.append(shared)
    return {"kids": kids, "parent_name": user.name}


# --- Family co-creation: share ideas, vote on priorities, founding signup ---
@api_router.post("/family/ideas")
async def family_share_idea(body: FamilyIdea, user: User = Depends(get_current_user)):
    _require_parent(user)
    idea = (body.idea or "").strip()
    if len(idea) < 10:
        raise HTTPException(status_code=400, detail="Idea too short (min 10 chars)")
    await db.family_ideas.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user.user_id,
        "parent_name": user.name,
        "parent_email": user.email,
        "idea": idea[:1000],
        "category": body.category,
        "upvotes": 0,
        "status": "new",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"ok": True}


@api_router.get("/family/polls")
async def family_get_polls(user: User = Depends(get_current_user)):
    _require_parent(user)
    my_vote = await db.family_poll_votes.find_one({"user_id": user.user_id}, {"_id": 0})
    options = []
    for opt in FEATURE_POLL_OPTIONS:
        count = await db.family_poll_votes.count_documents({"option_ids": opt["id"]})
        options.append({**opt, "votes": count})
    return {
        "title": "Which feature should we build next?",
        "subtitle": "Vote for as many as you want. Your pick guides our roadmap.",
        "options": options,
        "my_vote": my_vote.get("option_ids", []) if my_vote else [],
    }


@api_router.post("/family/polls/vote")
async def family_vote_poll(body: PollVote, user: User = Depends(get_current_user)):
    _require_parent(user)
    valid_ids = {o["id"] for o in FEATURE_POLL_OPTIONS}
    picks = [x for x in body.option_ids if x in valid_ids][:10]
    await db.family_poll_votes.update_one(
        {"user_id": user.user_id},
        {"$set": {"user_id": user.user_id, "option_ids": picks, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"ok": True}


@api_router.get("/family/founding-status")
async def family_founding_status(user: User = Depends(get_current_user)):
    count = await db.family_founding_signups.count_documents({})
    mine = await db.family_founding_signups.find_one({"user_id": user.user_id}, {"_id": 0})
    return {
        "signed_up": bool(mine),
        "signup": mine,
        "total_signups": count,
        "cap": FOUNDING_PARENT_CAP,
        "spots_left": max(0, FOUNDING_PARENT_CAP - count),
        "founding_price": FOUNDING_PARENT_PRICE,
        "launch_price": FAMILY_PLAN_LAUNCH_PRICE,
    }


@api_router.post("/family/founding-signup")
async def family_founding_signup(body: FoundingParentSignup, user: User = Depends(get_current_user)):
    _require_parent(user)
    if not body.agrees_to_founding_terms:
        raise HTTPException(status_code=400, detail="Must agree to founding terms")
    count = await db.family_founding_signups.count_documents({})
    existing = await db.family_founding_signups.find_one({"user_id": user.user_id}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Already on the waitlist")
    slot = count + 1
    await db.family_founding_signups.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user.user_id,
        "email": user.email,
        "name": user.name,
        "slot_number": slot,
        "price_locked": FOUNDING_PARENT_PRICE,
        "within_cap": slot <= FOUNDING_PARENT_CAP,
        "signed_up_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"ok": True, "slot_number": slot, "within_cap": slot <= FOUNDING_PARENT_CAP, "price_locked": FOUNDING_PARENT_PRICE}


# --- Admin: review family ideas, poll results, founding waitlist ---
@api_router.get("/admin/family/ideas")
async def admin_family_ideas(_: bool = Depends(require_admin)):
    items = await db.family_ideas.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"ideas": items}


@api_router.get("/admin/family/polls")
async def admin_family_polls(_: bool = Depends(require_admin)):
    options = []
    for opt in FEATURE_POLL_OPTIONS:
        count = await db.family_poll_votes.count_documents({"option_ids": opt["id"]})
        options.append({**opt, "votes": count})
    total_voters = await db.family_poll_votes.count_documents({})
    return {"options": sorted(options, key=lambda x: -x["votes"]), "total_voters": total_voters}


@api_router.get("/admin/family/founding")
async def admin_family_founding(_: bool = Depends(require_admin)):
    items = await db.family_founding_signups.find({}, {"_id": 0}).sort("slot_number", 1).to_list(500)
    return {"signups": items, "cap": FOUNDING_PARENT_CAP}


# -----------------------------
# Sponsor inquiry — public form on /sponsor page, admin CSV export
# -----------------------------
class SponsorInquiry(BaseModel):
    name: str
    company: str
    email: str
    role: Optional[str] = None
    budget_tier: Optional[Literal["under_10k", "10k_50k", "50k_plus", "lead_partner", "unsure"]] = None
    round_interest: Optional[str] = None
    message: str
    # Lead Partner strategic fields (only present for 6-figure partnership inquiries)
    partnership_pillars: Optional[List[Literal["talent_pipeline", "brand_architecture", "curriculum_arm", "impact_narrative", "custom_cohort", "exec_access"]]] = None
    desired_range: Optional[Literal["50k_100k", "100k_250k", "250k_500k", "500k_plus", "design_together"]] = None
    hero_outcome: Optional[str] = None  # "What's the ONE thing a successful partnership would give you?"


@api_router.post("/sponsor/inquire")
async def sponsor_inquire(body: SponsorInquiry, request: Request):
    # Light validation — public endpoint, be strict on length/format
    name = (body.name or "").strip()[:120]
    company = (body.company or "").strip()[:200]
    email = (body.email or "").strip()[:200]
    message = (body.message or "").strip()[:2000]
    if not name or not company or not email or len(message) < 20:
        raise HTTPException(status_code=400, detail="Name, company, email, and a 20+ char message required")
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Valid email required")

    doc = {
        "id": str(uuid.uuid4()),
        "name": name,
        "company": company,
        "email": email,
        "role": (body.role or "").strip()[:120] or None,
        "budget_tier": body.budget_tier,
        "round_interest": (body.round_interest or "").strip()[:200] or None,
        "message": message,
        "partnership_pillars": body.partnership_pillars or None,
        "desired_range": body.desired_range,
        "hero_outcome": (body.hero_outcome or "").strip()[:1000] or None if body.hero_outcome else None,
        "source_ip": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent", "")[:300] or None,
        "status": "new",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.sponsor_inquiries.insert_one(doc)
    return {"ok": True, "inquiry_id": doc["id"]}


@api_router.get("/admin/sponsor/inquiries")
async def admin_sponsor_inquiries(_: bool = Depends(require_admin)):
    items = await db.sponsor_inquiries.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return {"inquiries": items, "total": len(items)}


# =============================================================================
# Miles Academy — academic-edge / homeschool / tutor-supplement vertical
# Accessible from both Kid (Max) and Parent (Maya) contexts.
# Brand name is injected from config (MILES_BRAND_NAME) so rename is a 1-line swap.
# =============================================================================

_MILES_RULES_BLOCK = f"""VOICE FLOOR RULES (apply to every persona):
- You are part of {MILES_BRAND_NAME}, the academic-edge companion to The Business of Life by Adam Bond Devereau.
- Max (kid life coach) and Maya (parent coach) are siblings to you. When relevant, reference them — you do not replace them; you teach alongside them.
- You coach kids (and the parents guiding them) through ACADEMIC subjects: math, writing, reading, science, history, languages, test prep, college applications, general study skills.
- You never do the work FOR the student. You teach the underlying pattern, then ask them to apply it. Homework-cheating detectors are not your enemy; learning is.
- If a student pastes an assignment and asks you to solve it, you solve ONE example, explain the pattern, then give them the next one to try themselves.
- BANNED PHRASES: "That's a great question", "It's important that...", "It's crucial that...", "I understand how you feel", "You should consider...". Never start a response with "I".
- Max 5 sentences in any response. Mobile-first.
- End every response with ONE sharp question that moves learning forward — either a next-step prompt, a concept check, or a metacognitive nudge ("which part of this felt fuzzy?").
- No bullet points unless the student explicitly asks for steps or a list.
- If a student shares distress that's bigger than academics (hopelessness, harm, crisis), stop academic coaching immediately and say: "That sounds bigger than homework. Got a trusted adult — parent, counselor, or coach — you can talk to right now? You don't have to figure that part alone." Then follow their lead.

FRAMEWORK — THE FOUR {MILES_BRAND_SHORT.upper()} BURNERS:
1. MASTERY — depth in the subject itself. Don't ship surface-level tricks.
2. MOTIVATION — connect today's work to a future the student actually wants.
3. METHOD — study habits, spaced repetition, active recall, schedule discipline.
4. MINDSET — identity and confidence. A student who thinks "I'm bad at math" will stay bad at math until that sentence dies.

Rotate focus based on what the student brings. Keep a baseline under each.

THE ACCELERATOR — Adam Bond Devereau's chunking methodology, and the engine underneath everything {MILES_BRAND_NAME} teaches. Adam built a career on the discovered ability to skim massive volumes of material, extract the high-signal chunks, build rapid mental models, and look like a domain expert in a fraction of the time a "study every page" approach would take. Modern cognitive science (Miller, Ericsson, syntopical reading) confirmed what Adam already knew: chunking is how the human mind actually masters complexity. As an academic coach, you actively run students through the Accelerator — when they bring you a chapter, an essay topic, or a study deck, your default move is: identify what's signal, what's noise, what chunks actually matter, what mental model ties them together. Name it as "running the Accelerator on this." Teach the move, don't just do it.

THE GENIUS STACK — the AI tooling that automates the Accelerator at scale. Three layers: NotebookLM (drop in textbooks, lecture videos, articles, podcasts — get back consolidated signal with citations, comparative analysis, audio overviews, flashcards, mind maps), Obsidian (the student's permanent personal vault — every note compounds forever, fully under their control), Gemini (the synthesizer for creative output, scripts, applications on top of clean source-grounded notes). When a student is buried in volume — a syllabus, a topic they want to master fast, a paper that requires synthesizing 12 sources — point them at the Genius Stack. Reference it like a peer who actually uses it. Don't pitch it like a product."""


MILES_PERSONAS = {
    "ivy": {
        "display_name": "Ivy",
        "tagline": "The patient tutor — warm, encouraging, never makes you feel dumb.",
        "sample_line": "Okay — take a breath. This is a tough one, and the fact that you're here working on it already means you're doing more than most. Let's look at what you've got so far and find the one piece that's missing.",
        "prompt": f"""You are IVY — a warm, patient, encouraging academic tutor. Feminine, soothing, steady. The best teacher a student ever had, the kind of voice that makes a kid who thinks they're "bad at math" realize they were just under-coached.

{_MILES_RULES_BLOCK}

IVY-SPECIFIC VOICE:
- Lead with warmth. Acknowledge effort before correcting an answer.
- Celebrate small wins genuinely — "That step right there? That's the hard part, and you nailed it."
- When a student is frustrated or anxious, slow down. Name the feeling in one sentence, THEN teach.
- Use gentle, inviting language: "Let's try this together." "What do you notice about this one?" "Walk me through what you were thinking."
- Never condescend. Never use fake-cheerful filler. Warmth is not the same as softness on the material — you still teach rigor, just without shame.""",
    },
    "vance": {
        "display_name": "Vance",
        "tagline": "The motivator — inspirational, vision-casting, turns homework into a mission.",
        "sample_line": "Hey. The reason this feels hard isn't because you're dumb — it's because nobody showed you *why* it matters yet. You crack this one subject and suddenly three doors open you didn't even know were doors. Let's go.",
        "prompt": f"""You are VANCE — a motivational, inspirational academic coach. Hype with substance. You turn a worksheet into a mission and a struggling student into someone who remembers why they started.

{_MILES_RULES_BLOCK}

VANCE-SPECIFIC VOICE:
- Open energy. You treat every session like you actually believe this student is going somewhere — because you do.
- Always tie today's work to a future the student has mentioned wanting. If they haven't, draw it out: "What's this class unlocking for you — college, a career, a bet you made with yourself?"
- Reframe "I can't" into "I haven't yet." Without being corny.
- Name the stakes without fear-mongering. "This essay is not the whole college app, but your discipline this week is the muscle you'll use for all of it."
- When a student wins, mark it loud. When they lose, you stay in the ring with them — no pity.""",
    },
    "drake": {
        "display_name": "Drake",
        "tagline": "The rigorous coach — structured, high-standards, hard truths with real warmth.",
        "sample_line": "You're behind schedule and both of us know it. Here's the good news — behind is a fact, not a verdict. We're going to fix the schedule tonight, do the next two problems right now, and I'm going to hold you to it because I know you can hit it.",
        "prompt": f"""You are DRAKE — a structured, high-standards, rigorous academic coach. Hard truths delivered with real warmth. You run tight practice loops, insist on depth, and tell students what their teachers often won't.

{_MILES_RULES_BLOCK}

DRAKE-SPECIFIC VOICE:
- Direct. No sugarcoating, no fake praise. If a student's answer is wrong, say it's wrong and then teach the correct pattern.
- Set structure. Propose tight study loops (20-min focused blocks, active recall, spaced review). Name deadlines explicitly.
- When a student makes an excuse, name the pattern, not the person: "That's the same move as last time — what changes tonight?"
- Warmth lives in your belief in them, NOT in soft words. "You're better than this answer, and we both know it" is a Drake line.
- Always end a session with a concrete micro-commitment: "What are you doing in the next 30 minutes to make today real?" """,
    },
}


class MilesPersonaPick(BaseModel):
    persona: Literal["ivy", "vance", "drake"]
    documentary_interest: Optional[Literal["yes", "maybe", "no"]] = None


class MilesChatRequest(BaseModel):
    messages: List[ChatMessage]
    subject: Optional[str] = None  # one of MILES_VALID_SUBJECTS


class MilesChatResponse(BaseModel):
    message: str
    remaining_today: int
    miles_memory_card: Optional[str] = None
    limit_state: Literal["normal", "approaching", "final_five", "exhausted"] = "normal"
    nudge: Optional[str] = None
    persona: str


class MilesMemoryUpdate(BaseModel):
    miles_memory_card: str


class MilesIdea(BaseModel):
    idea: str
    category: Literal["subject", "format", "tutor", "homeschool", "other"]


class MilesPollVote(BaseModel):
    option_ids: List[str]


class MilesFoundingSignup(BaseModel):
    agrees_to_founding_terms: bool


class MilesDocumentaryUpdate(BaseModel):
    documentary_interest: Literal["yes", "maybe", "no"]


def _subject_hint(subject: Optional[str]) -> str:
    if not subject or subject == "general" or subject not in MILES_VALID_SUBJECTS:
        return ""
    pretty = subject.replace("_", " ").title()
    return f"\n\nCURRENT SUBJECT FOCUS: {pretty}. Tailor examples, vocabulary, and pedagogy to this subject."


async def _build_miles_memory_card(user_id: str, existing: Optional[str], recent_turns: List[dict]) -> str:
    LlmChat, UserMessage = get_llm_symbols()
    convo_text = "\n".join([f"{t['role']}: {t['content']}" for t in recent_turns])
    summary_prompt = (
        f"You are {MILES_BRAND_SHORT}'s memory engine. Distill what you now know about this learner into a compact academic note. "
        "Under 5 short lines. Focus on: grade level / age clues, subjects in focus, current strengths and gaps, "
        "habits and discipline issues, specific goals (exam, admissions, subject mastery), and confidence/mindset signals. "
        "Plain-English third person, no fluff."
    )
    if existing:
        summary_prompt += f"\n\nPrior memory:\n{existing}\n\nUpdate with new info from these turns:"
    else:
        summary_prompt += "\n\nBuild a fresh memory note from these turns:"
    summary_prompt += f"\n\n{convo_text}"

    summarizer = LlmChat(
        api_key=EMERGENT_KEY,
        session_id=f"miles-summary-{user_id}-{uuid.uuid4().hex[:6]}",
        system_message="You write compact academic memory notes. Max 5 short lines. No preamble.",
    ).with_model("anthropic", MILES_SUMMARY_MODEL).with_params(max_tokens=MILES_SUMMARY_MAX_TOKENS)

    try:
        new_card = await summarizer.send_message(UserMessage(text=summary_prompt))
        return new_card.strip()[:2000]
    except Exception as e:
        logger.warning(f"Miles memory summarization failed: {e}")
        return existing or ""


@api_router.get("/miles/config")
async def miles_config():
    """Public-ish config for UI rendering. No auth needed — used in onboarding copy."""
    return {
        "brand_name": MILES_BRAND_NAME,
        "brand_short": MILES_BRAND_SHORT,
        "founding_price": MILES_FOUNDING_PRICE,
        "launch_price": MILES_LAUNCH_PRICE,
        "founding_cap": MILES_FOUNDING_CAP,
        "daily_cap": MILES_DAILY_MESSAGE_CAP,
        "personas": [
            {"id": p, "display_name": MILES_PERSONAS[p]["display_name"],
             "tagline": MILES_PERSONAS[p]["tagline"], "sample_line": MILES_PERSONAS[p]["sample_line"]}
            for p in MILES_VALID_PERSONAS
        ],
        "subjects": MILES_VALID_SUBJECTS,
        "accelerator_enabled": True,
        "genius_stack": {
            "name": "The Genius Stack",
            "tagline": "The 3-tool AI system that automates Adam's Accelerator method.",
            "tools": [
                {"id": "notebooklm", "name": "NotebookLM", "role": "The Aggregator", "what": "Ingest sources (PDFs, YouTube, articles, podcasts). Strip duplicates. Extract pure signal with citations.", "url": "https://notebooklm.google.com"},
                {"id": "obsidian", "name": "Obsidian", "role": "The Vault", "what": "Your permanent personal knowledge base. Every note compounds forever — under your control.", "url": "https://obsidian.md"},
                {"id": "gemini", "name": "Gemini", "role": "The Synthesizer", "what": "Layer creative output on top of clean source-grounded notes. Scripts, applications, deeper synthesis.", "url": "https://gemini.google.com"},
            ],
        },
    }


@api_router.get("/miles/me")
async def miles_me(user: User = Depends(get_current_user)):
    _require_onboarded(user)
    today = date.today().isoformat()
    daily_count = user.miles_daily_count if user.miles_daily_count_date == today else 0
    return {
        "persona": user.miles_persona,
        "persona_display_name": MILES_PERSONAS[user.miles_persona]["display_name"] if user.miles_persona else None,
        "memory_card": user.miles_memory_card,
        "remaining_today": max(0, MILES_DAILY_MESSAGE_CAP - daily_count),
        "daily_cap": MILES_DAILY_MESSAGE_CAP,
        "documentary_interest": user.miles_documentary_interest,
        "onboarded_at": user.miles_onboarded_at,
    }


@api_router.post("/miles/persona")
async def miles_set_persona(body: MilesPersonaPick, user: User = Depends(get_current_user)):
    _require_onboarded(user)
    if body.persona not in MILES_VALID_PERSONAS:
        raise HTTPException(status_code=400, detail="Invalid persona")
    update = {"miles_persona": body.persona}
    if user.miles_onboarded_at is None:
        update["miles_onboarded_at"] = datetime.now(timezone.utc).isoformat()
    if body.documentary_interest is not None:
        update["miles_documentary_interest"] = body.documentary_interest
    await db.users.update_one({"user_id": user.user_id}, {"$set": update})
    return {
        "ok": True,
        "persona": body.persona,
        "persona_display_name": MILES_PERSONAS[body.persona]["display_name"],
    }


@api_router.patch("/miles/documentary")
async def miles_update_documentary(body: MilesDocumentaryUpdate, user: User = Depends(get_current_user)):
    _require_onboarded(user)
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"miles_documentary_interest": body.documentary_interest}},
    )
    return {"ok": True, "documentary_interest": body.documentary_interest}


@api_router.post("/miles/chat", response_model=MilesChatResponse)
async def miles_chat(req: MilesChatRequest, user: User = Depends(get_current_user)):
    LlmChat, UserMessage = get_llm_symbols()
    _require_onboarded(user)
    if not user.miles_persona:
        raise HTTPException(status_code=400, detail="Pick a Miles persona first")
    if not req.messages:
        raise HTTPException(status_code=400, detail="messages required")
    if not EMERGENT_KEY:
        raise HTTPException(status_code=500, detail="LLM not configured")

    today = date.today().isoformat()
    daily_count = user.miles_daily_count if user.miles_daily_count_date == today else 0
    used_booster = False
    if daily_count >= MILES_DAILY_MESSAGE_CAP:
        if user.miles_boosters_remaining > 0:
            used_booster = True
        else:
            raise HTTPException(status_code=429, detail="daily_cap_reached")

    remaining_before = MILES_DAILY_MESSAGE_CAP - daily_count
    persona = MILES_PERSONAS[user.miles_persona]
    memory_context = (
        f"\n\n{persona['display_name'].upper()}'S MEMORY OF THIS LEARNER:\n{user.miles_memory_card}\n\nUse this context naturally; don't robotically repeat it."
        if user.miles_memory_card else ""
    )
    nudge_instruction = ""
    if remaining_before <= MILES_NUDGE_FINAL:
        nudge_instruction = (
            f"\n\nSYSTEM NOTE (not visible to user): This learner has {remaining_before} message(s) left today on the free plan. "
            f"After your normal answer, add ONE short, matter-of-fact line — in your own voice — mentioning Founding {MILES_BRAND_SHORT} unlocks unlimited sessions at ${MILES_FOUNDING_PRICE}/mo "
            f"(locked for a year, launches at ${MILES_LAUNCH_PRICE}/mo). Skip this nudge entirely if the user just shared distress or a crisis moment."
        )

    full_system = persona["prompt"] + _subject_hint(req.subject) + memory_context + nudge_instruction

    last = req.messages[-1]
    if last.role != "user":
        raise HTTPException(status_code=400, detail="last message must be user")

    prior = req.messages[:-1][-(MILES_RAW_HISTORY_KEEP * 2):]
    transcript = ""
    if prior:
        lines = [f"{'Learner' if m.role == 'user' else persona['display_name']}: {m.content}" for m in prior]
        transcript = "\n\nRECENT CONVERSATION:\n" + "\n".join(lines) + "\n\nContinue naturally."

    chat_client = LlmChat(
        api_key=EMERGENT_KEY,
        session_id=f"miles-chat-{user.user_id}-{uuid.uuid4().hex[:6]}",
        system_message=full_system + transcript,
    ).with_model("anthropic", MILES_CHAT_MODEL).with_params(max_tokens=MILES_MAX_REPLY_TOKENS)

    try:
        reply = await chat_client.send_message(UserMessage(text=last.content))
    except Exception as e:
        logger.exception("Miles chat LLM error")
        raise HTTPException(status_code=500, detail=str(e))

    await db.miles_chat_logs.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user.user_id,
        "persona": user.miles_persona,
        "subject": req.subject if req.subject in MILES_VALID_SUBJECTS else None,
        "user": last.content,
        "assistant": reply,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    new_exchange = user.miles_exchange_count_since_summary + 1
    new_daily = daily_count + 1
    miles_update = {
        "miles_daily_count": new_daily,
        "miles_daily_count_date": today,
        "miles_exchange_count_since_summary": new_exchange,
    }
    if used_booster:
        miles_update["miles_boosters_remaining"] = max(0, user.miles_boosters_remaining - 1)
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": miles_update},
    )

    updated_memory = user.miles_memory_card
    if new_exchange >= MILES_SUMMARY_EVERY_N_EXCHANGES:
        recent_docs = await db.miles_chat_logs.find(
            {"user_id": user.user_id}, {"_id": 0, "user": 1, "assistant": 1}
        ).sort("timestamp", -1).limit(MILES_SUMMARY_EVERY_N_EXCHANGES).to_list(MILES_SUMMARY_EVERY_N_EXCHANGES)
        recent_turns = []
        for d in reversed(recent_docs):
            recent_turns.append({"role": "user", "content": d["user"]})
            recent_turns.append({"role": "assistant", "content": d["assistant"]})
        updated_memory = await _build_miles_memory_card(user.user_id, user.miles_memory_card, recent_turns)
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$set": {"miles_memory_card": updated_memory, "miles_exchange_count_since_summary": 0}},
        )

    remaining_after = max(0, MILES_DAILY_MESSAGE_CAP - new_daily)
    if remaining_after == 0:
        limit_state = "exhausted"
    elif remaining_after <= MILES_NUDGE_FINAL:
        limit_state = "final_five"
    elif remaining_after <= MILES_NUDGE_APPROACHING:
        limit_state = "approaching"
    else:
        limit_state = "normal"

    nudge_banner = None
    if limit_state == "approaching":
        nudge_banner = f"{remaining_after} messages left today."
    elif limit_state == "final_five":
        nudge_banner = f"{remaining_after} left. Founding {MILES_BRAND_SHORT} unlocks unlimited — ${MILES_FOUNDING_PRICE}/mo locked for a year."

    return MilesChatResponse(
        message=reply,
        remaining_today=remaining_after,
        miles_memory_card=updated_memory,
        limit_state=limit_state,
        nudge=nudge_banner,
        persona=user.miles_persona,
    )


@api_router.get("/miles/chat/history")
async def miles_chat_history(user: User = Depends(get_current_user), limit: int = 40):
    _require_onboarded(user)
    limit = max(1, min(200, limit))
    docs = await db.miles_chat_logs.find(
        {"user_id": user.user_id}, {"_id": 0, "user": 1, "assistant": 1, "timestamp": 1, "subject": 1}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    turns = []
    for d in reversed(docs):
        turns.append({"role": "user", "content": d["user"], "timestamp": d.get("timestamp"), "subject": d.get("subject")})
        turns.append({"role": "assistant", "content": d["assistant"], "timestamp": d.get("timestamp"), "subject": d.get("subject")})
    today = date.today().isoformat()
    daily_count = user.miles_daily_count if user.miles_daily_count_date == today else 0
    return {
        "messages": turns,
        "remaining_today": max(0, MILES_DAILY_MESSAGE_CAP - daily_count),
        "daily_cap": MILES_DAILY_MESSAGE_CAP,
    }


@api_router.get("/miles/memory")
async def miles_get_memory(user: User = Depends(get_current_user)):
    _require_onboarded(user)
    return {"miles_memory_card": user.miles_memory_card or ""}


@api_router.put("/miles/memory")
async def miles_update_memory(upd: MilesMemoryUpdate, user: User = Depends(get_current_user)):
    _require_onboarded(user)
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"miles_memory_card": upd.miles_memory_card[:2000], "miles_exchange_count_since_summary": 0}},
    )
    return {"ok": True, "miles_memory_card": upd.miles_memory_card[:2000]}


@api_router.delete("/miles/memory")
async def miles_reset_memory(user: User = Depends(get_current_user)):
    _require_onboarded(user)
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"miles_memory_card": None, "miles_exchange_count_since_summary": 0}},
    )
    return {"ok": True}


# --- Miles co-creation: ideas, polls, founding waitlist ---
@api_router.post("/miles/ideas")
async def miles_share_idea(body: MilesIdea, user: User = Depends(get_current_user)):
    _require_onboarded(user)
    idea = (body.idea or "").strip()
    if len(idea) < 10:
        raise HTTPException(status_code=400, detail="Idea too short (min 10 chars)")
    await db.miles_ideas.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user.user_id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "idea": idea[:1500],
        "category": body.category,
        "status": "new",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"ok": True}


@api_router.get("/miles/polls")
async def miles_get_polls(user: User = Depends(get_current_user)):
    _require_onboarded(user)
    my_vote = await db.miles_poll_votes.find_one({"user_id": user.user_id}, {"_id": 0})
    options = []
    for opt in MILES_FEATURE_POLL_OPTIONS:
        count = await db.miles_poll_votes.count_documents({"option_ids": opt["id"]})
        options.append({**opt, "votes": count})
    return {
        "title": f"Help shape {MILES_BRAND_NAME}",
        "subtitle": "Vote for what we build next. Founding members' picks go to the top of the roadmap.",
        "options": options,
        "my_vote": my_vote.get("option_ids", []) if my_vote else [],
    }


@api_router.post("/miles/polls/vote")
async def miles_vote_poll(body: MilesPollVote, user: User = Depends(get_current_user)):
    _require_onboarded(user)
    valid_ids = {o["id"] for o in MILES_FEATURE_POLL_OPTIONS}
    picks = [x for x in body.option_ids if x in valid_ids][:10]
    await db.miles_poll_votes.update_one(
        {"user_id": user.user_id},
        {"$set": {"user_id": user.user_id, "option_ids": picks, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"ok": True}


@api_router.get("/miles/founding-status")
async def miles_founding_status(user: User = Depends(get_current_user)):
    _require_onboarded(user)
    count = await db.miles_founding_signups.count_documents({})
    mine = await db.miles_founding_signups.find_one({"user_id": user.user_id}, {"_id": 0})
    return {
        "signed_up": bool(mine),
        "signup": mine,
        "total_signups": count,
        "cap": MILES_FOUNDING_CAP,
        "spots_left": max(0, MILES_FOUNDING_CAP - count),
        "founding_price": MILES_FOUNDING_PRICE,
        "launch_price": MILES_LAUNCH_PRICE,
        "brand_name": MILES_BRAND_NAME,
        "brand_short": MILES_BRAND_SHORT,
    }


@api_router.post("/miles/founding-signup")
async def miles_founding_signup(body: MilesFoundingSignup, user: User = Depends(get_current_user)):
    _require_onboarded(user)
    if not body.agrees_to_founding_terms:
        raise HTTPException(status_code=400, detail="Must agree to founding terms")
    existing = await db.miles_founding_signups.find_one({"user_id": user.user_id}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Already on the waitlist")
    count = await db.miles_founding_signups.count_documents({})
    slot = count + 1
    await db.miles_founding_signups.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user.user_id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "slot_number": slot,
        "price_locked": MILES_FOUNDING_PRICE,
        "within_cap": slot <= MILES_FOUNDING_CAP,
        "signed_up_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"ok": True, "slot_number": slot, "within_cap": slot <= MILES_FOUNDING_CAP, "price_locked": MILES_FOUNDING_PRICE}


# --- Admin: Miles review endpoints ---
@api_router.get("/admin/miles/ideas")
async def admin_miles_ideas(_: bool = Depends(require_admin)):
    items = await db.miles_ideas.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"ideas": items}


@api_router.get("/admin/miles/polls")
async def admin_miles_polls(_: bool = Depends(require_admin)):
    options = []
    for opt in MILES_FEATURE_POLL_OPTIONS:
        count = await db.miles_poll_votes.count_documents({"option_ids": opt["id"]})
        options.append({**opt, "votes": count})
    total_voters = await db.miles_poll_votes.count_documents({})
    return {"options": sorted(options, key=lambda x: -x["votes"]), "total_voters": total_voters}


@api_router.get("/admin/miles/founding")
async def admin_miles_founding(_: bool = Depends(require_admin)):
    items = await db.miles_founding_signups.find({}, {"_id": 0}).sort("slot_number", 1).to_list(500)
    return {"signups": items, "cap": MILES_FOUNDING_CAP, "founding_price": MILES_FOUNDING_PRICE}


@api_router.get("/admin/miles/documentary-interest")
async def admin_miles_documentary(_: bool = Depends(require_admin)):
    """Documentary-interested Miles users — reality-show candidate pool."""
    cursor = db.users.find(
        {"miles_documentary_interest": {"$in": ["yes", "maybe"]}},
        {"_id": 0, "user_id": 1, "email": 1, "name": 1, "role": 1, "miles_documentary_interest": 1,
         "miles_persona": 1, "miles_onboarded_at": 1},
    )
    users = await cursor.to_list(2000)
    yes_count = sum(1 for u in users if u.get("miles_documentary_interest") == "yes")
    maybe_count = sum(1 for u in users if u.get("miles_documentary_interest") == "maybe")
    return {"users": users, "total": len(users), "yes_count": yes_count, "maybe_count": maybe_count}


# =============================================================================
# Phase 1C — Stripe Checkout (one-time payments for boosters, founding locks,
# sponsor tiers). Subscriptions will be layered in once the user migrates to
# their live Stripe account + creates recurring Price IDs.
# =============================================================================

from emergentintegrations.payments.stripe.checkout import (  # noqa: E402
    StripeCheckout,
    CheckoutSessionRequest,
)

STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY")

# Server-defined product catalog — NEVER trust client prices
STRIPE_PRODUCTS = {
    "booster_max_30": {
        "name": "Max Booster Pack",
        "description": "+200 extra messages with Max (kid coach)",
        "amount": 2.99,
        "currency": "usd",
        "kind": "booster",
        "target": "max",
        "auth_required": True,
    },
    "booster_maya_30": {
        "name": "Maya Booster Pack",
        "description": "+200 extra messages with Maya (parent coach)",
        "amount": 2.99,
        "currency": "usd",
        "kind": "booster",
        "target": "maya",
        "auth_required": True,
    },
    "booster_miles_30": {
        "name": "Miles Booster Pack",
        "description": "+200 extra messages with your Miles Academy coach",
        "amount": 2.99,
        "currency": "usd",
        "kind": "booster",
        "target": "miles",
        "auth_required": True,
    },
    "founding_family_lock": {
        "name": "Founding Parent — Family Plan",
        "description": "Lock in $14.50/mo for 1 year (launches at $29/mo)",
        "amount": 14.50,
        "currency": "usd",
        "kind": "founding_lock",
        "target": "family",
        "auth_required": True,
    },
    "founding_miles_lock": {
        "name": "Founding Miles",
        "description": "Lock in $9.50/mo for 1 year (launches at $19/mo)",
        "amount": 9.50,
        "currency": "usd",
        "kind": "founding_lock",
        "target": "miles",
        "auth_required": True,
    },
    "sponsor_spotlight": {
        "name": "Max Pitch Spotlight Sponsor",
        "description": "Power one round of Max Pitch",
        "amount": 5000.00,
        "currency": "usd",
        "kind": "sponsor",
        "target": "spotlight",
        "auth_required": False,
    },
    "sponsor_anchor": {
        "name": "Max Pitch Anchor Sponsor",
        "description": "Year-long Max Pitch flywheel — 3 rounds + microsite + CSV",
        "amount": 15000.00,
        "currency": "usd",
        "kind": "sponsor",
        "target": "anchor",
        "auth_required": False,
    },
}


class StripeCheckoutRequest(BaseModel):
    product_id: str
    origin_url: str  # frontend origin, never trusted for price
    sponsor_inquiry_id: Optional[str] = None  # for sponsor tier purchases — links back to the inquiry
    sponsor_email: Optional[str] = None  # used when sponsor purchases without auth
    sponsor_name: Optional[str] = None


async def _get_optional_user(
    session_token: Optional[str] = Cookie(None),
    authorization: Optional[str] = Header(None),
) -> Optional[User]:
    """Best-effort auth resolver — returns None instead of 401. Used for sponsor endpoints."""
    try:
        token = session_token
        if not token and authorization and authorization.startswith("Bearer "):
            token = authorization[7:]
        if not token:
            return None
        session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
        if not session:
            return None
        expires_at = session["expires_at"]
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            return None
        user_doc = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
        if not user_doc:
            return None
        return User(**user_doc)
    except Exception:
        return None


@api_router.post("/stripe/checkout")
async def stripe_create_checkout(
    body: StripeCheckoutRequest,
    request: Request,
    user: Optional[User] = Depends(_get_optional_user),
):
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    product = STRIPE_PRODUCTS.get(body.product_id)
    if not product:
        raise HTTPException(status_code=400, detail="Unknown product")

    # Auth gate — boosters + founding locks require a logged-in user
    if product["auth_required"] and not user:
        raise HTTPException(status_code=401, detail="Login required for this purchase")

    # Origin validation — must be http/https
    origin = (body.origin_url or "").strip().rstrip("/")
    if not origin.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="Invalid origin_url")

    # Construct success/cancel URLs from origin
    success_url = f"{origin}/payment/return?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/payment/return?cancelled=1"

    # Metadata — everything we need to reconcile on status check
    metadata = {
        "product_id": body.product_id,
        "kind": product["kind"],
        "target": product["target"],
    }
    if user:
        metadata["user_id"] = user.user_id
        metadata["user_email"] = user.email
    if body.sponsor_inquiry_id:
        metadata["sponsor_inquiry_id"] = body.sponsor_inquiry_id
    if body.sponsor_email and not user:
        metadata["sponsor_email"] = body.sponsor_email.strip()[:200]
    if body.sponsor_name and not user:
        metadata["sponsor_name"] = body.sponsor_name.strip()[:120]

    host_url = str(request.base_url)
    webhook_url = f"{host_url.rstrip('/')}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    checkout_req = CheckoutSessionRequest(
        amount=float(product["amount"]),
        currency=product["currency"],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )
    try:
        session = await stripe_checkout.create_checkout_session(checkout_req)
    except Exception as e:
        logger.exception("Stripe create session failed")
        raise HTTPException(status_code=500, detail=f"Stripe error: {e}")

    # MANDATORY: persist the transaction as pending before handing off to Stripe
    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "product_id": body.product_id,
        "amount": float(product["amount"]),
        "currency": product["currency"],
        "kind": product["kind"],
        "target": product["target"],
        "metadata": metadata,
        "user_id": user.user_id if user else None,
        "user_email": user.email if user else metadata.get("sponsor_email"),
        "sponsor_inquiry_id": body.sponsor_inquiry_id,
        "payment_status": "pending",
        "status": "initiated",
        "credited": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"url": session.url, "session_id": session.session_id}


async def _credit_transaction(tx: dict) -> None:
    """Idempotent redemption — applies the product effect once per session_id."""
    if tx.get("credited"):
        return
    kind = tx.get("kind")
    target = tx.get("target")
    meta = tx.get("metadata") or {}
    user_id = tx.get("user_id") or meta.get("user_id")
    now = datetime.now(timezone.utc)

    if kind == "booster" and user_id:
        field = {"max": "max_boosters_remaining", "maya": "parent_boosters_remaining", "miles": "miles_boosters_remaining"}.get(target)
        if field:
            await db.users.update_one({"user_id": user_id}, {"$inc": {field: 200}})
    elif kind == "founding_lock" and user_id:
        locked_until = (now + timedelta(days=365)).isoformat()
        if target == "family":
            await db.users.update_one({"user_id": user_id}, {"$set": {"family_founding_locked_until": locked_until}})
            # Also ensure waitlist record exists + marked as paid
            existing = await db.family_founding_signups.find_one({"user_id": user_id}, {"_id": 0})
            if not existing:
                count = await db.family_founding_signups.count_documents({})
                await db.family_founding_signups.insert_one({
                    "id": str(uuid.uuid4()), "user_id": user_id,
                    "email": tx.get("user_email"), "name": meta.get("user_email", "").split("@")[0],
                    "slot_number": count + 1, "price_locked": 14.50,
                    "within_cap": (count + 1) <= FOUNDING_PARENT_CAP,
                    "signed_up_at": now.isoformat(),
                    "status": "paid", "paid_at": now.isoformat(),
                    "stripe_session_id": tx.get("session_id"),
                })
            else:
                await db.family_founding_signups.update_one(
                    {"user_id": user_id},
                    {"$set": {"status": "paid", "paid_at": now.isoformat(), "stripe_session_id": tx.get("session_id")}},
                )
        elif target == "miles":
            await db.users.update_one({"user_id": user_id}, {"$set": {"miles_founding_locked_until": locked_until}})
            existing = await db.miles_founding_signups.find_one({"user_id": user_id}, {"_id": 0})
            if not existing:
                count = await db.miles_founding_signups.count_documents({})
                await db.miles_founding_signups.insert_one({
                    "id": str(uuid.uuid4()), "user_id": user_id,
                    "email": tx.get("user_email"), "name": meta.get("user_email", "").split("@")[0],
                    "slot_number": count + 1, "price_locked": 9.50,
                    "within_cap": (count + 1) <= MILES_FOUNDING_CAP,
                    "signed_up_at": now.isoformat(),
                    "status": "paid", "paid_at": now.isoformat(),
                    "stripe_session_id": tx.get("session_id"),
                })
            else:
                await db.miles_founding_signups.update_one(
                    {"user_id": user_id},
                    {"$set": {"status": "paid", "paid_at": now.isoformat(), "stripe_session_id": tx.get("session_id")}},
                )
    elif kind == "sponsor":
        # Update the sponsor inquiry if linked
        inquiry_id = tx.get("sponsor_inquiry_id") or meta.get("sponsor_inquiry_id")
        if inquiry_id:
            await db.sponsor_inquiries.update_one(
                {"id": inquiry_id},
                {"$set": {
                    "status": "paid", "tier_purchased": target,
                    "amount_paid": tx.get("amount"), "paid_at": now.isoformat(),
                    "stripe_session_id": tx.get("session_id"),
                }},
            )

    await db.payment_transactions.update_one(
        {"session_id": tx["session_id"]},
        {"$set": {"credited": True, "credited_at": now.isoformat()}},
    )


@api_router.get("/stripe/status/{session_id}")
async def stripe_check_status(session_id: str, request: Request):
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Session not found")

    host_url = str(request.base_url)
    webhook_url = f"{host_url.rstrip('/')}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)

    try:
        status = await stripe_checkout.get_checkout_status(session_id)
    except Exception as e:
        logger.exception("Stripe status check failed")
        raise HTTPException(status_code=500, detail=f"Stripe error: {e}")

    # Persist latest state
    update = {
        "payment_status": status.payment_status,
        "status": status.status,
        "last_checked_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.payment_transactions.update_one({"session_id": session_id}, {"$set": update})

    # Credit once, only on successful paid state
    if status.payment_status == "paid" and not tx.get("credited"):
        fresh_tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
        if fresh_tx and not fresh_tx.get("credited"):
            await _credit_transaction(fresh_tx)

    return {
        "session_id": session_id,
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency,
        "product_id": tx.get("product_id"),
        "kind": tx.get("kind"),
        "target": tx.get("target"),
        "credited": tx.get("credited") or status.payment_status == "paid",
    }


@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    if not STRIPE_API_KEY:
        return {"ok": False}
    host_url = str(request.base_url)
    webhook_url = f"{host_url.rstrip('/')}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    try:
        event = await stripe_checkout.handle_webhook(body, sig)
    except Exception as e:
        logger.warning(f"Stripe webhook verify failed: {e}")
        raise HTTPException(status_code=400, detail="Invalid webhook")

    session_id = getattr(event, "session_id", None)
    payment_status = getattr(event, "payment_status", None)
    if session_id and payment_status == "paid":
        tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
        if tx and not tx.get("credited"):
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"payment_status": "paid", "status": "complete", "webhook_received_at": datetime.now(timezone.utc).isoformat()}},
            )
            fresh = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
            if fresh and not fresh.get("credited"):
                await _credit_transaction(fresh)
    return {"ok": True}


@api_router.get("/stripe/products")
async def stripe_list_products():
    """Public-ish listing of purchasable products (for UI rendering)."""
    return {
        "products": [
            {"product_id": k, "name": v["name"], "description": v["description"],
             "amount": v["amount"], "currency": v["currency"], "kind": v["kind"], "target": v["target"]}
            for k, v in STRIPE_PRODUCTS.items()
        ]
    }


@api_router.get("/stripe/my-purchases")
async def stripe_my_purchases(user: User = Depends(get_current_user)):
    """Current user's booster + founding lock status."""
    today = date.today().isoformat()
    return {
        "max_boosters_remaining": user.max_boosters_remaining,
        "parent_boosters_remaining": user.parent_boosters_remaining,
        "miles_boosters_remaining": user.miles_boosters_remaining,
        "family_founding_locked_until": user.family_founding_locked_until,
        "miles_founding_locked_until": user.miles_founding_locked_until,
        "date": today,
    }


@api_router.get("/admin/stripe/transactions")
async def admin_stripe_transactions(_: bool = Depends(require_admin)):
    txs = await db.payment_transactions.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    total_paid = sum(t["amount"] for t in txs if t.get("payment_status") == "paid")
    return {"transactions": txs, "total": len(txs), "total_paid_usd": round(total_paid, 2)}


# -----------------------------
# PayPal Checkout — runs alongside Stripe (or solo, depending on config flags).
# Uses PayPal Orders v2 REST API directly (no SDK dependency).
# Reuses the same `payment_transactions` collection + `_credit_transaction()` reducer.
# Server-defined catalog: never trusts price/currency from client.
# -----------------------------
PAYPAL_CLIENT_ID = os.environ.get("PAYPAL_CLIENT_ID")
PAYPAL_SECRET = os.environ.get("PAYPAL_SECRET")
PAYPAL_ENV = os.environ.get("PAYPAL_ENV", "sandbox").lower()
PAYPAL_BASE = "https://api-m.sandbox.paypal.com" if PAYPAL_ENV == "sandbox" else "https://api-m.paypal.com"


async def _paypal_access_token() -> str:
    if not (PAYPAL_CLIENT_ID and PAYPAL_SECRET):
        raise HTTPException(status_code=500, detail="PayPal not configured")
    async with httpx.AsyncClient(timeout=15) as ax:
        resp = await ax.post(
            f"{PAYPAL_BASE}/v1/oauth2/token",
            auth=(PAYPAL_CLIENT_ID, PAYPAL_SECRET),
            headers={"Accept": "application/json", "Accept-Language": "en_US"},
            data={"grant_type": "client_credentials"},
        )
    if resp.status_code != 200:
        logger.error("PayPal OAuth failed: %s %s", resp.status_code, resp.text[:300])
        raise HTTPException(status_code=502, detail="PayPal authentication failed")
    return resp.json()["access_token"]


class PayPalCreateOrder(BaseModel):
    product_id: str
    sponsor_inquiry_id: Optional[str] = None
    sponsor_email: Optional[str] = None
    sponsor_name: Optional[str] = None


@api_router.post("/paypal/create-order")
async def paypal_create_order(
    body: PayPalCreateOrder,
    request: Request,
    user: Optional[User] = Depends(_get_optional_user),
):
    if not ENABLE_PAYPAL_CHECKOUT:
        raise HTTPException(status_code=503, detail="PayPal checkout is currently disabled")

    product = STRIPE_PRODUCTS.get(body.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Unknown product")

    if product.get("auth_required") and not user:
        raise HTTPException(status_code=401, detail="Login required for this purchase")

    amount_str = f"{product['amount']:.2f}"
    currency = product["currency"].upper()

    access = await _paypal_access_token()
    order_payload = {
        "intent": "CAPTURE",
        "purchase_units": [{
            "reference_id": body.product_id,
            "description": product["description"][:127],
            "amount": {"currency_code": currency, "value": amount_str},
        }],
        "application_context": {
            "brand_name": "MaxCoach · Hidden Genius Labs",
            "shipping_preference": "NO_SHIPPING",
            "user_action": "PAY_NOW",
        },
    }
    async with httpx.AsyncClient(timeout=20) as ax:
        resp = await ax.post(
            f"{PAYPAL_BASE}/v2/checkout/orders",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {access}",
                "PayPal-Request-Id": str(uuid.uuid4()),  # idempotency
            },
            json=order_payload,
        )
    if resp.status_code not in (200, 201):
        logger.error("PayPal create-order failed: %s %s", resp.status_code, resp.text[:500])
        raise HTTPException(status_code=502, detail="PayPal order creation failed")
    order = resp.json()
    order_id = order["id"]

    # Persist a pending transaction — uses session_id field for compat with _credit_transaction
    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": order_id,         # PayPal order id slots into the same field
        "provider": "paypal",
        "product_id": body.product_id,
        "kind": product["kind"],
        "target": product["target"],
        "amount": product["amount"],
        "currency": product["currency"],
        "user_id": user.user_id if user else None,
        "user_email": user.email if user else None,
        "sponsor_inquiry_id": body.sponsor_inquiry_id,
        "metadata": {
            "user_id": user.user_id if user else None,
            "user_email": user.email if user else None,
            "sponsor_inquiry_id": body.sponsor_inquiry_id,
            "sponsor_email": body.sponsor_email,
            "sponsor_name": body.sponsor_name,
        },
        "payment_status": "pending",
        "credited": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"order_id": order_id}


class PayPalCaptureOrder(BaseModel):
    order_id: str


@api_router.post("/paypal/capture-order")
async def paypal_capture_order(body: PayPalCaptureOrder):
    if not ENABLE_PAYPAL_CHECKOUT:
        raise HTTPException(status_code=503, detail="PayPal checkout is currently disabled")

    tx = await db.payment_transactions.find_one({"session_id": body.order_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Order not found")

    # If already credited, return idempotent success
    if tx.get("credited"):
        return {"ok": True, "already_credited": True, "product_id": tx.get("product_id"), "amount": tx.get("amount")}

    access = await _paypal_access_token()
    async with httpx.AsyncClient(timeout=20) as ax:
        resp = await ax.post(
            f"{PAYPAL_BASE}/v2/checkout/orders/{body.order_id}/capture",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {access}",
                "PayPal-Request-Id": f"capture-{body.order_id}",
            },
        )
    if resp.status_code not in (200, 201):
        # 422 with INSTRUMENT_DECLINED etc. — surface clean error to user
        try:
            err_data = resp.json()
        except Exception:
            err_data = {"raw": resp.text[:300]}
        logger.error("PayPal capture failed: %s %s", resp.status_code, err_data)
        await db.payment_transactions.update_one(
            {"session_id": body.order_id},
            {"$set": {"payment_status": "failed", "last_error": str(err_data)[:500]}},
        )
        raise HTTPException(status_code=502, detail="Payment capture failed")

    capture = resp.json()
    status = capture.get("status", "UNKNOWN")
    paypal_capture_id = None
    try:
        paypal_capture_id = capture["purchase_units"][0]["payments"]["captures"][0]["id"]
    except Exception:
        pass

    if status == "COMPLETED":
        await db.payment_transactions.update_one(
            {"session_id": body.order_id},
            {"$set": {
                "payment_status": "paid",
                "paypal_capture_id": paypal_capture_id,
                "captured_at": datetime.now(timezone.utc).isoformat(),
            }},
        )
        fresh = await db.payment_transactions.find_one({"session_id": body.order_id}, {"_id": 0})
        if fresh:
            await _credit_transaction(fresh)
        return {"ok": True, "already_credited": False, "product_id": tx.get("product_id"), "amount": tx.get("amount")}
    else:
        await db.payment_transactions.update_one(
            {"session_id": body.order_id},
            {"$set": {"payment_status": status.lower()}},
        )
        return {"ok": False, "status": status}


@api_router.get("/paypal/config")
async def paypal_config():
    """Public — used by frontend to load PayPal SDK with the correct client_id + env."""
    configured = ENABLE_PAYPAL_CHECKOUT and bool(PAYPAL_CLIENT_ID and PAYPAL_SECRET)
    return {
        "enabled": configured,
        "client_id": PAYPAL_CLIENT_ID if configured else None,
        "env": PAYPAL_ENV,
        "currency": "USD",
    }


# -----------------------------
# Aquidneck Island Free Books campaign — public landing capture
# -----------------------------
class AquidneckClaim(BaseModel):
    first_name: str
    email: str
    school: Literal["newport_high", "middletown_high", "portsmouth_high", "other"]
    role: Literal["junior", "senior", "teacher_staff"]
    reality_project_interest: bool = False
    other_school_name: Optional[str] = None


@api_router.post("/aquidneck/claim")
async def aquidneck_claim(body: AquidneckClaim, request: Request):
    first_name = (body.first_name or "").strip()[:80]
    email = (body.email or "").strip().lower()[:200]
    if not first_name or not email:
        raise HTTPException(status_code=400, detail="First name and email required")
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Valid email required")

    # Soft de-dupe: if same email already claimed, return ok with already_claimed flag
    existing = await db.aquidneck_book_signups.find_one({"email": email}, {"_id": 0})
    if existing:
        return {"ok": True, "already_claimed": True, "id": existing["id"]}

    doc = {
        "id": str(uuid.uuid4()),
        "first_name": first_name,
        "email": email,
        "school": body.school,
        "other_school_name": (body.other_school_name or "").strip()[:120] or None,
        "role": body.role,
        "reality_project_interest": bool(body.reality_project_interest),
        "source_ip": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent", "")[:300] or None,
        "status": "new",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.aquidneck_book_signups.insert_one(doc)

    # Fire email delivery (non-blocking — never fails the API response)
    school_label = SCHOOL_LABELS.get(body.school, "Aquidneck Island")
    if body.school == "other" and doc.get("other_school_name"):
        school_label = doc["other_school_name"]
    role_label = ROLE_LABELS.get(body.role, body.role)
    html = aquidneck_email_html(first_name, school_label, role_label)
    text_fallback = (
        f"Hey {first_name} — thanks for claiming your free copy of {AQUIDNECK_BOOK_TITLE}.\n\n"
        f"Download here: {AQUIDNECK_BOOK_URL}\n\n"
        "If the book helps you, an honest Amazon review means the world.\n\n"
        "— Adam Bond Devereau · Hidden Genius Labs LLC"
    )
    email_result = await send_email_async(
        to_email=email,
        subject=f"📖 {first_name}, your free copy of The Business of Life is here",
        html=html,
        text_fallback=text_fallback,
    )
    # Persist delivery outcome on the signup record (non-blocking, best-effort)
    try:
        await db.aquidneck_book_signups.update_one(
            {"id": doc["id"]},
            {"$set": {
                "email_sent": email_result.get("ok", False),
                "email_id": email_result.get("id"),
                "email_error": email_result.get("error"),
                "email_sent_at": datetime.now(timezone.utc).isoformat(),
            }},
        )
    except Exception as ex:
        logger.warning("Failed to update email status on signup %s: %s", doc["id"], ex)

    return {"ok": True, "already_claimed": False, "id": doc["id"], "email_sent": email_result.get("ok", False)}


class AdminEmailTest(BaseModel):
    to_email: str
    first_name: Optional[str] = "Adam"


@api_router.post("/admin/email/test")
async def admin_email_test(body: AdminEmailTest, _: bool = Depends(require_admin)):
    """Admin smoke test for the Aquidneck delivery email."""
    html = aquidneck_email_html(body.first_name or "there", "Newport High", "Test")
    text_fallback = f"Test email from MaxCoach. Download: {AQUIDNECK_BOOK_URL}"
    res = await send_email_async(
        to_email=body.to_email,
        subject=f"📖 [TEST] Your free copy of {AQUIDNECK_BOOK_TITLE}",
        html=html,
        text_fallback=text_fallback,
    )
    return {"ok": res.get("ok", False), "result": res, "from": RESEND_FROM_EMAIL}


@api_router.get("/admin/aquidneck/signups")
async def admin_aquidneck_signups(_: bool = Depends(require_admin)):
    items = await db.aquidneck_book_signups.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    by_school = {}
    by_role = {}
    reality_count = 0
    for it in items:
        by_school[it["school"]] = by_school.get(it["school"], 0) + 1
        by_role[it["role"]] = by_role.get(it["role"], 0) + 1
        if it.get("reality_project_interest"):
            reality_count += 1
    return {
        "signups": items,
        "total": len(items),
        "by_school": by_school,
        "by_role": by_role,
        "reality_interested": reality_count,
    }


# -----------------------------
# Teacher Hub — public roster of teachers/coaches who want to be in the toolkit.
# Completely isolated from Max Pitch. Uses a separate `teachers` collection.
# Public profiles only appear on the hub after admin approval.
# -----------------------------
TEACHER_EXPERTISE_OPTIONS = [
    "video_production",
    "coaching",
    "ai_tools",
    "writing",
    "college_prep",
    "entrepreneurship",
    "mental_health",
    "fitness_health",
    "music",
    "art_design",
    "stem",
    "languages",
    "trades",
    "other",
]


class TeacherApplyRequest(BaseModel):
    name: str
    email: str
    bio: str
    expertise: List[str]
    why_great: str
    photo_url: Optional[str] = None
    other_expertise: Optional[str] = None
    school: Optional[str] = None
    role_title: Optional[str] = None
    student_need: Optional[str] = None
    toolkit_tool: Optional[str] = None
    teacher_student_problem: Optional[str] = None
    filmed_publicly: Optional[str] = None
    filmed_note: Optional[str] = None
    summer_availability: Optional[str] = None
    video_pitch_url: Optional[str] = None
    retreat_interest: bool = False


class TeacherUpdateRequest(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    expertise: Optional[List[str]] = None
    why_great: Optional[str] = None
    photo_url: Optional[str] = None
    other_expertise: Optional[str] = None
    school: Optional[str] = None
    role_title: Optional[str] = None
    student_need: Optional[str] = None
    toolkit_tool: Optional[str] = None
    teacher_student_problem: Optional[str] = None
    filmed_publicly: Optional[str] = None
    filmed_note: Optional[str] = None
    summer_availability: Optional[str] = None
    video_pitch_url: Optional[str] = None
    retreat_interest: Optional[bool] = None


def _validate_teacher_payload(name: str, bio: str, why_great: str, expertise: List[str]) -> None:
    name = (name or "").strip()
    bio = (bio or "").strip()
    why_great = (why_great or "").strip()
    if not name or len(name) < 2:
        raise HTTPException(status_code=400, detail="Name is required")
    if len(name) > 120:
        raise HTTPException(status_code=400, detail="Name too long (max 120 chars)")
    if not bio or len(bio) < 30:
        raise HTTPException(status_code=400, detail="Bio is too short (min 30 chars)")
    if len(bio) > 1500:
        raise HTTPException(status_code=400, detail="Bio too long (max 1500 chars)")
    if not why_great or len(why_great) < 30:
        raise HTTPException(status_code=400, detail="'Why I'm great' is too short (min 30 chars)")
    if len(why_great) > 600:
        raise HTTPException(status_code=400, detail="'Why I'm great' too long (max 600 chars)")
    if not expertise or not isinstance(expertise, list):
        raise HTTPException(status_code=400, detail="Pick at least one expertise tag")
    invalid = [e for e in expertise if e not in TEACHER_EXPERTISE_OPTIONS]
    if invalid:
        raise HTTPException(status_code=400, detail=f"Invalid expertise tag(s): {invalid}")


@api_router.get("/teachers")
async def teachers_list_public(user: Optional[User] = Depends(_get_optional_user)):
    """Public hub — only approved teachers, with vote counts and (if signed in) the user's own votes."""
    items = await db.teachers.find(
        {"status": "approved"},
        {"_id": 0, "email": 0, "source_ip": 0, "user_agent": 0},
    ).to_list(500)

    # Aggregate vote counts in a single round-trip
    teacher_ids = [t["id"] for t in items]
    counts = {}
    if teacher_ids:
        pipeline = [
            {"$match": {"teacher_id": {"$in": teacher_ids}}},
            {"$group": {"_id": "$teacher_id", "n": {"$sum": 1}}},
        ]
        async for row in db.teacher_votes.aggregate(pipeline):
            counts[row["_id"]] = row["n"]

    # Pull this user's votes if signed in
    my_votes = set()
    if user:
        async for v in db.teacher_votes.find(
            {"user_id": user.user_id, "teacher_id": {"$in": teacher_ids}},
            {"_id": 0, "teacher_id": 1},
        ):
            my_votes.add(v["teacher_id"])

    for t in items:
        t["vote_count"] = counts.get(t["id"], 0)
        t["has_voted"] = t["id"] in my_votes

    # Sort by votes desc, then by approved_at desc as tiebreaker
    items.sort(
        key=lambda x: (-x.get("vote_count", 0), x.get("approved_at") or "", x.get("created_at") or ""),
        reverse=False,
    )
    # Re-sort with negative count handled (the lambda above puts higher counts first; secondary alpha keeps stable)
    items.sort(key=lambda x: x.get("vote_count", 0), reverse=True)

    return {
        "teachers": items,
        "total": len(items),
        "expertise_options": TEACHER_EXPERTISE_OPTIONS,
        "viewer_can_vote": user is not None,
    }


@api_router.post("/teachers/{teacher_id}/vote")
async def teacher_toggle_vote(
    teacher_id: str,
    user: Optional[User] = Depends(_get_optional_user),
):
    """Authed-only — toggles the current user's vote for the given teacher.
    One vote per (user_id, teacher_id) pair, enforced by unique index."""
    if not user:
        raise HTTPException(status_code=401, detail="Sign in to vote for the toolkit builder.")

    teacher = await db.teachers.find_one({"id": teacher_id, "status": "approved"}, {"_id": 0, "id": 1})
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    existing = await db.teacher_votes.find_one(
        {"user_id": user.user_id, "teacher_id": teacher_id}, {"_id": 0}
    )
    now = datetime.now(timezone.utc).isoformat()
    if existing:
        await db.teacher_votes.delete_one({"user_id": user.user_id, "teacher_id": teacher_id})
        action = "removed"
    else:
        await db.teacher_votes.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user.user_id,
            "user_email": user.email,
            "user_role": user.role,
            "teacher_id": teacher_id,
            "created_at": now,
        })
        action = "added"

    new_count = await db.teacher_votes.count_documents({"teacher_id": teacher_id})
    return {"ok": True, "action": action, "vote_count": new_count, "has_voted": action == "added"}


@api_router.get("/teachers/leaderboard")
async def teacher_leaderboard(limit: int = 10):
    """Public leaderboard — top N approved teachers by vote count."""
    limit = max(1, min(int(limit), 50))
    items = await db.teachers.find(
        {"status": "approved"},
        {"_id": 0, "email": 0, "source_ip": 0, "user_agent": 0, "bio": 0, "why_great": 0,
         "other_expertise": 0, "created_at": 0, "approved_at": 0, "status": 0,
         "status_updated_at": 0, "updated_at": 0},
    ).to_list(500)
    if not items:
        return {"leaderboard": [], "total_voters": 0}

    teacher_ids = [t["id"] for t in items]
    counts = {}
    pipeline = [
        {"$match": {"teacher_id": {"$in": teacher_ids}}},
        {"$group": {"_id": "$teacher_id", "n": {"$sum": 1}}},
    ]
    async for row in db.teacher_votes.aggregate(pipeline):
        counts[row["_id"]] = row["n"]
    for t in items:
        t["vote_count"] = counts.get(t["id"], 0)
    items.sort(key=lambda x: x["vote_count"], reverse=True)

    total_voters = await db.teacher_votes.distinct("user_id")
    return {"leaderboard": items[:limit], "total_voters": len(total_voters)}


# Optional: extend role vocabulary (non-breaking — existing 'kid' / 'parent' roles untouched)
ROLE_TEACHER = "teacher"
ROLE_STUDENT = "student"  # alias surfaced for clarity; existing 'kid' role keeps working


@api_router.post("/teachers/apply")
async def teachers_apply(body: TeacherApplyRequest, request: Request):
    """Public application — creates a pending teacher profile."""
    name = body.name.strip()[:120]
    email = (body.email or "").strip().lower()[:200]
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Valid email required")
    bio = body.bio.strip()[:1500]
    why_great = body.why_great.strip()[:600]
    expertise = body.expertise or []
    _validate_teacher_payload(name, bio, why_great, expertise)

    photo_url = (body.photo_url or "").strip()[:500] or None
    if photo_url and not photo_url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="photo_url must be http(s)")

    other_expertise = (body.other_expertise or "").strip()[:120] or None
    school = (body.school or "").strip()[:120] or None
    role_title = (body.role_title or "").strip()[:120] or None
    student_need = (body.student_need or "").strip()[:1000] or None
    toolkit_tool = (body.toolkit_tool or "").strip()[:160] or None
    teacher_student_problem = (body.teacher_student_problem or "").strip()[:1000] or None
    filmed_publicly = (body.filmed_publicly or "").strip()[:40] or None
    filmed_note = (body.filmed_note or "").strip()[:500] or None
    summer_availability = (body.summer_availability or "").strip()[:120] or None
    video_pitch_url = (body.video_pitch_url or "").strip()[:500] or None
    retreat_interest = bool(body.retreat_interest)
    if video_pitch_url and not video_pitch_url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="video_pitch_url must be http(s)")

    # De-dupe by email — let people update an existing pending application
    existing = await db.teachers.find_one({"email": email}, {"_id": 0})
    if existing and existing.get("status") == "approved":
        raise HTTPException(status_code=409, detail="A profile with this email is already approved. Use the update endpoint.")

    now = datetime.now(timezone.utc).isoformat()
    if existing:
        await db.teachers.update_one(
            {"email": email},
            {"$set": {
                "name": name,
                "bio": bio,
                "expertise": expertise,
                "other_expertise": other_expertise,
                "why_great": why_great,
                "photo_url": photo_url,
                "school": school,
                "role_title": role_title,
                "student_need": student_need,
                "toolkit_tool": toolkit_tool,
                "teacher_student_problem": teacher_student_problem,
                "filmed_publicly": filmed_publicly,
                "filmed_note": filmed_note,
                "summer_availability": summer_availability,
                "video_pitch_url": video_pitch_url,
                "retreat_interest": retreat_interest,
                "status": "pending",
                "updated_at": now,
            }},
        )
        return {"ok": True, "id": existing["id"], "status": "pending", "updated": True}

    doc = {
        "id": str(uuid.uuid4()),
        "name": name,
        "email": email,
        "bio": bio,
        "expertise": expertise,
        "other_expertise": other_expertise,
        "why_great": why_great,
        "photo_url": photo_url,
        "school": school,
        "role_title": role_title,
        "student_need": student_need,
        "toolkit_tool": toolkit_tool,
        "teacher_student_problem": teacher_student_problem,
        "filmed_publicly": filmed_publicly,
        "filmed_note": filmed_note,
        "summer_availability": summer_availability,
        "video_pitch_url": video_pitch_url,
        "retreat_interest": retreat_interest,
        "status": "pending",
        "source_ip": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent", "")[:300] or None,
        "created_at": now,
    }
    await db.teachers.insert_one(doc)
    return {"ok": True, "id": doc["id"], "status": "pending", "updated": False}


@api_router.get("/admin/teachers")
async def admin_teachers_list(_: bool = Depends(require_admin)):
    items = await db.teachers.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    by_status = {}
    for it in items:
        s = it.get("status") or "unknown"
        by_status[s] = by_status.get(s, 0) + 1
    return {"teachers": items, "total": len(items), "by_status": by_status}


class TeacherStatusUpdate(BaseModel):
    status: Literal["approved", "rejected", "pending"]


@api_router.post("/admin/teachers/{teacher_id}/status")
async def admin_teacher_set_status(
    teacher_id: str, body: TeacherStatusUpdate, _: bool = Depends(require_admin)
):
    teacher = await db.teachers.find_one({"id": teacher_id}, {"_id": 0})
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    update = {"status": body.status, "status_updated_at": datetime.now(timezone.utc).isoformat()}
    if body.status == "approved" and not teacher.get("approved_at"):
        update["approved_at"] = datetime.now(timezone.utc).isoformat()
    await db.teachers.update_one({"id": teacher_id}, {"$set": update})
    return {"ok": True, "status": body.status}


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


async def _ensure_indexes_background():
    # TTL index auto-expires old sessions so user_sessions doesn't grow forever
    try:
        await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
    except Exception as e:
        logger.warning(f"TTL index create failed: {e}")

    # One vote per (user, teacher) — race-condition safe enforcement at the DB level
    try:
        await db.teacher_votes.create_index(
            [("user_id", 1), ("teacher_id", 1)], unique=True, name="uniq_user_teacher_vote"
        )
        await db.teacher_votes.create_index([("teacher_id", 1)], name="by_teacher")
    except Exception as e:
        logger.warning(f"teacher_votes index create failed: {e}")


async def _warm_mongo_connection():
    try:
        await asyncio.wait_for(db.command("ping"), timeout=5)
        logger.info("MongoDB warmup ping OK")
    except Exception as e:
        logger.warning(f"MongoDB warmup ping skipped/failed: {e}")


@app.on_event("startup")
async def startup():
    asyncio.create_task(_warm_mongo_connection())
    asyncio.create_task(_ensure_indexes_background())


@app.on_event("shutdown")
async def shutdown():
    client.close()
