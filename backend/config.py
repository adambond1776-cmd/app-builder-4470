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
PITCH_ROUND_CAP = 50  # max pitch submissions per round (cost control); after cap, waitlist only
UPVOTE_RATE_LIMIT_PER_IP_PER_DAY = 30  # anti-spam; anonymous votes capped per IP per day

# --- Family OS ---
PARENT_CHAT_MODEL = "claude-sonnet-4-6"
PARENT_SUMMARY_MODEL = "claude-haiku-4-5-20251001"
PARENT_MAX_REPLY_TOKENS = 450  # slightly higher than Max — parents get a little more
PARENT_SUMMARY_MAX_TOKENS = 300
PARENT_SUMMARY_EVERY_N_EXCHANGES = 6
PARENT_RAW_HISTORY_KEEP = 6
PARENT_DAILY_MESSAGE_CAP = 30  # Free-tier daily cap for Maya (mirrors Max for now)
# Progressive nudge thresholds (remaining messages)
PARENT_NUDGE_APPROACHING = 10  # first soft banner
PARENT_NUDGE_FINAL = 5         # in-response upgrade nudge in Maya's tone
FAMILY_PLAN_LAUNCH_PRICE = 29  # dollars/month at full launch
FOUNDING_PARENT_PRICE = 14.50  # 50% off, locked for 1 year
FOUNDING_PARENT_CAP = 100  # first 100 parents get the founding rate
INVITE_CODE_EXPIRY_HOURS = 48
FEATURE_POLL_OPTIONS = [
    {"id": "coach_parent", "label": "AI coach for parents (like Max, tuned for you)"},
    {"id": "family_meeting", "label": "Weekly family meeting assistant"},
    {"id": "progress_reports", "label": "Monthly progress reports by email"},
    {"id": "sibling_link", "label": "Link siblings to see each other's shared progress"},
    {"id": "goal_tracker", "label": "Shared family goal tracker"},
]

# --- Miles Academy (academic edge / homeschool / tutor-supplement) ---
# All brand-name references read from here — if domain forces a rename, swap these.
MILES_BRAND_NAME = "Miles Academy"
MILES_BRAND_SHORT = "Miles"
MILES_CHAT_MODEL = "claude-sonnet-4-6"
MILES_SUMMARY_MODEL = "claude-haiku-4-5-20251001"
MILES_MAX_REPLY_TOKENS = 450
MILES_SUMMARY_MAX_TOKENS = 300
MILES_SUMMARY_EVERY_N_EXCHANGES = 6
MILES_RAW_HISTORY_KEEP = 6
MILES_DAILY_MESSAGE_CAP = 30
MILES_NUDGE_APPROACHING = 10
MILES_NUDGE_FINAL = 5
MILES_FOUNDING_PRICE = 9.50     # Founding Miles — locked 1 year
MILES_LAUNCH_PRICE = 19          # Launch price / month after founding
MILES_FOUNDING_CAP = 50          # first N families get founding
MILES_VALID_PERSONAS = ["ivy", "vance", "drake"]
MILES_VALID_SUBJECTS = [
    "math", "writing", "reading", "science", "history",
    "languages", "test_prep", "college_apps", "general",
]
MILES_FEATURE_POLL_OPTIONS = [
    {"id": "curriculum_planner", "label": "Full curriculum planner (weekly/monthly lesson plans)"},
    {"id": "standards_alignment", "label": "Standards alignment (Common Core / state / AP)"},
    {"id": "live_tutor_sessions", "label": "Live tutor sessions with vetted humans"},
    {"id": "college_apps_studio", "label": "College applications studio (essays, lists, timelines)"},
    {"id": "subject_deep_dives", "label": "Subject deep-dives (mini-courses in Algebra, Writing, SAT, etc.)"},
    {"id": "parent_copilot", "label": "Homeschool parent co-pilot (daily structure + progress reports)"},
    {"id": "sibling_accounts", "label": "Multiple kids on one family account"},
]

# --- Feature flags ---
ENABLE_DOCUMENTARY_INTEREST = True
ENABLE_FOUNDING_20_APPLICATIONS = True
ENABLE_MAX_PITCH = True
ENABLE_FAMILY_OS = True

# --- Payment provider flags ---
# Set ENABLE_STRIPE_CHECKOUT=False to hide Stripe buttons in the UI.
# Stripe backend code remains intact — flip back to True any time to re-enable.
ENABLE_STRIPE_CHECKOUT = False
ENABLE_PAYPAL_CHECKOUT = True
