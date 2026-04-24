# Phase 1A scaling & cost tunables — change these to tune behavior across all users.
# Phase 3 will expose these via admin for per-cohort A/B testing.

# --- Cost controls ---
MAIN_CHAT_MODEL = "claude-sonnet-4-6"          # User-facing chat (quality)
SUMMARY_MODEL = "claude-haiku-4-5-20251001"    # Background summarization (~10x cheaper)
MAX_REPLY_TOKENS = 400                          # Max already replies in ≤4 sentences
SUMMARY_MAX_TOKENS = 300                        # Keep Memory Card concise

# --- Memory Card engine ---
SUMMARY_EVERY_N_EXCHANGES = 6                   # Refresh Memory Card every N user turns
RAW_HISTORY_KEEP = 6                            # Raw turns kept in context (rest = summary)

# --- Product limits ---
DAILY_MESSAGE_CAP = 30                          # Free-tier daily user cap
FOUNDING_20_CAP = 20                            # How many beta spots exist
SESSION_DAYS = 7                                # Auth session lifetime

# --- Max Pitch ---
CURRENT_ROUND_NAME = "Round 1 · Founding Pitch"
CURRENT_ROUND_DEADLINE = "2026-06-01T00:00:00Z"  # ISO format, change anytime
CURRENT_ROUND_SPONSOR_NAME = None  # e.g. "Powered by Intro.co"
CURRENT_ROUND_SPONSOR_URL = None
PITCH_TEXT_MAX_CHARS = 1800  # ~3 paragraphs
UPVOTE_RATE_LIMIT_PER_IP_PER_DAY = 30  # anti-spam; anonymous votes capped per IP per day

# --- Feature flags ---
ENABLE_DOCUMENTARY_INTEREST = True
ENABLE_FOUNDING_20_APPLICATIONS = True
ENABLE_MAX_PITCH = True
