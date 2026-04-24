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
