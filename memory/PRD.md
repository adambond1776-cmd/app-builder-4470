# Max — The Business of Life Coach
## Phase 1A complete — April 2026

## Original vision
Port + finish a Max AI life coach PWA for young people (16-23) into an Emergent-stack app, then evolve it into the AI layer of the Hidden Genius flywheel (Executive OS, SignalFoundry, Aura, reality doc).

## Phase 1A — What shipped
- **Emergent Google OAuth sign-in** (session cookies, 7-day, httpOnly)
- **Age gate + beta consent + documentary-interest signup screen** (3-option opt-in)
- **Per-user MongoDB profile** — Aura-ready schema; tracks + memory card + daily counts
- **Memory Card engine** — auto-summarizes every 6 exchanges using **Claude Haiku** (cheap); main chat on **Claude Sonnet 4.6**. Summary replaces raw history in context → real drift control + ~50% token savings
- **Memory screen** — view / edit / reset; kid owns their data
- **Home screen** — memory preview + 4-burner strip + Continue-with-Max + track switcher + Founding 20 CTA
- **Track-specific Max** — School / Work / Trade / Figuring It Out each have their own coaching lens + opening message
- **Four Burners info page** — explains theory, refutes it with Adam's thesis, 9 sourced quotes (Elon Musk, Sam Altman, Jeff Bezos, Alex Hormozi, Andrew Huberman, David Goggins, Naval Ravikant, Kobe Bryant, MrBeast), no-affiliate disclaimer on Atomic Habits link
- **Founding 20 application flow** — 3-question form; duplicate-prevention; status shown on home; stored in `founding_20_applications` collection for manual review/export
- **Daily cap** — 30 messages/day free (cap-hit screen teases booster packs coming in Phase 1C)
- **Cost optimizations active:** Memory Card summarization (~50%), tighter max_tokens=400 (60% cut on output), Haiku for background summaries (10× cheaper). Prompt caching deferred pending Emergent SDK passthrough check.
- **Scaling config** — `/app/backend/config.py` holds all tunables (cap, cadence, models, token limits) — Phase 3 admin UI hooks in here
- **Back buttons** on every screen

## Backend endpoints
- `POST /api/auth/session` · `GET /api/auth/me` · `POST /api/auth/logout`
- `PATCH /api/profile` · `GET/PUT/DELETE /api/memory`
- `POST /api/chat` (returns reply + remaining_today + memory_card)
- `GET /api/founding20/status` · `POST /api/founding20/apply`
- `POST /api/feedback` · `GET /api/health`

## Tech
- Backend: FastAPI + Motor + emergentintegrations (Claude via Emergent Universal Key)
- Frontend: React CRA + framer-motion + TailwindCSS
- DB: MongoDB — collections `users`, `user_sessions`, `chat_logs`, `feedback`, `founding_20_applications`

## What's next
**Phase 1B** — Apple sign-in + email/password fallback (JWT+bcrypt alongside Google)
**Phase 1C** — Stripe test-mode booster packs ($2.99 / 200 messages) · buy-more UI on cap-hit · parent-funded top-ups · purchase history
**Phase 2** — Weekly burner self-check + progress charts + commitment accountability loop
**Phase 3** — Admin dashboard for Founding 20 application review + per-cohort parameter A/B

## Known items for the next testing pass
- Browser-level end-to-end flow (post real Google OAuth) needs testing_agent validation
- Prompt caching (Anthropic native) — verify via SDK passthrough, +30-50% savings if it works

## Enhancement angle
The Founding 20 application funnel is the product's revenue wedge — you can charge selected applicants a ticket for the 90-day cohort, generating revenue *before* Stripe booster packs even ship. First applications are already being captured from day one of launch.

## April 24 update — Admin endpoints added
- `GET /api/admin/stats` (token-protected via `X-Admin-Token` header, stored in backend `.env` as `ADMIN_TOKEN`)
  - Returns user counts, track breakdown, documentary interest, Founding 20 pipeline (with `revenue_ready_leads`), engagement metrics
- `GET /api/admin/founding20/export.csv` — CSV dump of all Founding 20 applications for manual outreach / Stripe Payment Link blast
- Admin token + usage examples stored at `/app/memory/ADMIN.md`

## Max Pitch — shipped April 24 (Phase 1.5)

**What it is:** A matchmaking funnel where kids pitch themselves to be coached 1-on-1 by senior execs for 90 days. Community upvotes signal to judges, but judges pick based on fit — not pure popularity. This is the sponsor-attractable, documentary-worthy surface.

**Features shipped:**
- Pitch submission (3-paragraph text required + optional YouTube unlisted link) — one per user per round
- **Public pitch pages** at `/pitch/:slug` — shareable, no-login-required, viral by design
- **Anonymous upvoting** (IP-rate-limited 30/day) with "sign in to track" nudge after voting
- Authed upvoting dedupes by user_id
- **Judge magic-link flow** at `/judge?token=xxx` — no accounts needed
- Judge flagging ("I'd coach them" / "Pass") with optional notes
- **Admin match matrix** at `/api/admin/pitch/matrix` — Adam's final-selection worksheet
- Round config in `/app/backend/config.py` — sponsor name, deadline, round name all configurable with no code change
- Home screen CTA card to Max Pitch for authed users

**Why this matters:** This is the primary sponsor-attraction surface. "Intro.co powered Round 3 of Max Pitch" or "Sponsored coaching delivered to 12 kids this quarter" is concrete, measurable, and TV-friendly.

## April 24 — Family OS Lite v0 shipped

**What shipped:**
- Role fork at signup (kid / parent) — existing users default to `kid`
- Parent onboarding + 6-digit invite code (48hr expiry)
- Kid-side invite acceptance with granular privacy toggles (memory / burners / activity)
- Parent Family Dashboard showing linked kids with only what kids chose to share
- **Roadmap Polls** — parents vote on upcoming features (AI coach for parents, Family Meeting assistant, Monthly reports, Sibling linking, Family goal tracker). Real-time results visible.
- **Share an Idea** — parents submit categorized feature ideas; Adam reviews via admin endpoint
- **Founding Parent waitlist** — first 100 parents lock in $14.50/mo (50% off $29 launch). No payment yet — intent capture only.
- Raw chat content NEVER shared with parent — enforced at API layer
- Admin endpoints for ideas/polls/founding review
- Configurable via `config.py`: launch price, founding price, founding cap, poll options

**Architecture notes (stepping-stone protocols):**
- All family endpoints under `/api/family/*` prefix — future service boundary ready
- 6 separate Mongo collections: `family_invitations`, `family_links`, `family_ideas`, `family_poll_votes`, `family_founding_signups` (+ `role` field on users)
- Parent access to kid data always goes through permission check — parent cannot query kid data directly
- Kid can unlink anytime → parent loses all access immediately
- Splitting into standalone Family OS app in future = migrate 6 collections + move `/family/*` routes to new service

**Deferred to v1:** ~~Parent AI coach~~ **(shipped Apr 24 — see below)**, weekly family meeting assistant, Family Burners framework, multi-parent support, Stripe integration (Family Plan real payment), public idea voting (kids can upvote parent ideas), maxcoach.mom domain routing.

**Business model cemented:** Free tier for kids (organic growth). Parents pay Family Plan at $29/mo (or founding $14.50). Aligns incentives, recurring revenue, natural upgrade path.

## April 24 — Maya Parent Coach shipped (Family OS v1)

**What shipped:**
- **Maya** — Claude Sonnet 4.6 parent coach, warm/direct voice, Four Family Burners framework (Structure, Connection, Resources, Individual Growth)
- `POST /api/family/chat` / `GET /api/family/chat/history` / `GET/PUT/DELETE /api/family/memory` — parent-role-gated, onboarding-required
- **Memory Card for parents** — separate `parent_memory_card` field, summarized by Claude Haiku every 6 exchanges (same cost-saving architecture as kid's Max)
- **Parent-specific daily cap (30/day)** — isolated `parent_daily_count` + `parent_daily_count_date` so a future "both"-role user has zero counter collisions
- **Progressive upgrade nudges** baked into API response:
  - `limit_state: "normal"` (>10 remaining) — no banner
  - `limit_state: "approaching"` (≤10) — soft yellow banner
  - `limit_state: "final_five"` (≤5) — orange→purple banner + one-line Founding Parent nudge injected into Maya's reply (in her own voice)
  - `limit_state: "exhausted"` (30 used) — 429 from API, full upgrade wall on frontend with Founding Parent CTA
- **`ParentChatScreen.js`** with purple Maya brand identity (distinct from Max's blue), history rehydration on mount, graceful exhausted-state handling
- **Hero CTA** — "Talk to Maya · Your parent coach" at the top of Parent Dashboard
- **New collection:** `parent_chat_logs` (kept separate from kid `chat_logs`)

**Test coverage:** 18 new backend tests + 17 kid regression = 35/35 green. Full Playwright frontend flow validated. See `/app/backend/tests/test_maya_parent_chat.py`.

**Config knobs** (all in `/app/backend/config.py`):
- `PARENT_DAILY_MESSAGE_CAP = 30`
- `PARENT_NUDGE_APPROACHING = 10`
- `PARENT_NUDGE_FINAL = 5`
- `PARENT_SUMMARY_EVERY_N_EXCHANGES = 6`
- `PARENT_CHAT_MODEL = "claude-sonnet-4-6"` / `PARENT_SUMMARY_MODEL = "claude-haiku-4-5-20251001"`

## April 24 — Miles Academy shipped (academic-edge / homeschool / tutor-supplement vertical)

**Strategic context:** Extends the Max/Maya family into a third vertical — the academic-edge / homeschool / tutor-supplement layer of The Business of Life. Accessible from **both** Kid Mode (Max home) and Parent Mode (Maya dashboard) — parents use it for homeschool orchestration, kids use it directly for subject help.

**What shipped:**
- **Three persona coaches** (user picks one on onboarding, swappable):
  - **Ivy** 🌿 — warm, patient, encouraging (teal-green brand)
  - **Vance** 🚀 — motivational, inspirational, vision-caster (amber)
  - **Drake** 🎯 — rigorous, structured, hard truths with warmth (steel-blue)
- **9 subjects** auto-context the prompt: math, writing, reading, science, history, languages, test_prep, college_apps, general
- **Reality documentary opt-in** (yes/maybe/no) collected on onboarding — every Miles beta user is a potential reality-show subject, with their explicit permission. Admin endpoint `/api/admin/miles/documentary-interest` exports the candidate pool.
- **Same cost-saving architecture as Max/Maya:** Claude Sonnet 4.6 main chat, Haiku memory-card summarization every 6 exchanges, max_tokens caps, fully isolated `miles_daily_count` + `miles_memory_card`.
- **Progressive upgrade funnel:** normal → approaching (≤10) → final_five (≤5 — with in-reply line from coach in their voice) → exhausted (429 + Founding Miles wall).
- **Founding Miles pricing:** $9.50/mo locked for a year for first 50 families; launches at $19/mo (undercuts Aidemia's $19.99 while adding the whole ecosystem).
- **Co-creation loop:** Ideas (subject/format/tutor/homeschool/other), Polls (curriculum_planner / standards_alignment / live_tutor_sessions / college_apps_studio / subject_deep_dives / parent_copilot / sibling_accounts), Founding Miles waitlist.
- **Brand-swap safe:** Brand name reads from `MILES_BRAND_NAME` config constant — if the `milesacademy.*` domain isn't available, renaming is a one-line swap.
- **New collections:** `miles_chat_logs`, `miles_ideas`, `miles_poll_votes`, `miles_founding_signups`.

**Test coverage:** 35 new Miles backend tests + 35 regression (Max + Maya) = **70/70 green**. Full Playwright frontend flow validated. Tests at `/app/backend/tests/test_miles_academy.py`.

**Config knobs** (all in `/app/backend/config.py`):
- `MILES_BRAND_NAME = "Miles Academy"` / `MILES_BRAND_SHORT = "Miles"` — swap-safe
- `MILES_DAILY_MESSAGE_CAP = 30`, `MILES_FOUNDING_PRICE = 9.50`, `MILES_LAUNCH_PRICE = 19`, `MILES_FOUNDING_CAP = 50`
- `MILES_VALID_PERSONAS`, `MILES_VALID_SUBJECTS`, `MILES_FEATURE_POLL_OPTIONS`

## April 24 — Public Max Pitch Hub shipped (P1 — organic sharability)

**What shipped:**
- **`/pitches`** — Public, no-auth pitches index at the domain root level. Hero + live stats (pitches / upvotes / videos) + dual CTAs (Pitch Yourself + Sponsor a Round) + search + Top/Newest sort + per-track filter chips + responsive 2-column-friendly max-width layout. Kids share this URL on social to rally community votes beyond the individual `/pitch/:slug` page.
- **`/sponsor`** — Corporate sponsor landing page. Bold hero ("Back the next generation — before they're already expensive"), live round stats, 3 "Why sponsors come back" rationale cards (documentary moments / talent pipeline / compound brand equity), **3 sponsorship tiers** (Spotlight $5K, **Anchor $15K featured**, Enterprise custom), full inquiry form with budget-tier chips (Under $10K / $10K–$50K / $50K+ / Not sure yet).
- **Backend public aggregates:** `GET /api/pitch/public-stats` — round_name, deadline, sponsor info, totals (pitches/upvotes/videos), per-track breakdown. No PII. Safe for any public surface.
- **Backend lead capture:** `POST /api/sponsor/inquire` — public endpoint with email + 20-char-min-message validation; persists source_ip + user_agent + timestamped `sponsor_inquiries` doc.
- **Admin:** `GET /api/admin/sponsor/inquiries` — CSV-ready list sorted desc by created_at. Adam follows up within 2 business days per the form copy.
- **New collection:** `sponsor_inquiries`.

**Test coverage:** 19 new backend tests + 35 regression = **54/54 green** (`/app/backend/tests/test_pitch_hub_sponsor.py`). Full Playwright validation of both public pages — search, sort, track filter, card navigation, sponsor form validation + success state, zero console errors.

## Backlog / Prioritized Roadmap (as of Apr 24, 2026)

**P1 — next up:**
- Amazon book link for *The Business of Life: Student Edition* (blocked on user providing URL — kid-facing pages)
- Public Max Pitch Hub landing pages — `/pitches` index + `/sponsor` corporate landing page for sharability
- Stripe booster packs ($2.99 / 200 messages) + Maya upgrade wall CTA wired to live Stripe checkout

**P2:**
- Apple sign-in + email/password JWT fallback alongside Emergent Google Auth
- Weekly burner self-check + progress charts (kid side)
- Family Plan ($29/mo) live Stripe checkout
- Maya voice polish: weekly family-meeting assistant prompt variant

**P3 — refactoring:**
- Split `/app/backend/server.py` (1,390 lines) into `routers/` (auth, chat, family, pitch, admin) + `services/` (parent_memory, kid_memory) + `prompts/`
- Public voting mechanic for Parent Ideas (kids upvote parents' feature ideas)
- maxcoach.mom domain routing
