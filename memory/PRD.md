# Max — The Business of Life Coach (PWA)

## Original ask
User uploaded a pnpm monorepo (Express + Vite + TS) and asked me to finish the project.

## Implementation (ported to Emergent stack — Apr 2026)
- Backend (FastAPI) at /app/backend/server.py
  - POST /api/chat — Anthropic Claude (claude-sonnet-4-6) via emergentintegrations + EMERGENT_LLM_KEY; full Max system prompt (banned phrases, Four Burners, safety); logs to MongoDB chat_logs
  - POST /api/feedback — persists thumb up/down to MongoDB feedback
  - GET /api/health
- Frontend (React CRA + framer-motion) at /app/frontend/src/
  - App.js — screen state machine
  - pages/HiddenGeniusOnboarding.js — beta onboarding (localStorage gate hg_onboarded)
  - pages/WelcomeScreen.js — title, tagline, "Let's Go"
  - pages/TrackScreen.js — 4 tracks (College/Work/Trade/Figuring It Out)
  - pages/ChatScreen.js — full chat UI w/ typing indicator, feedback buttons, 10-exchange save-prompt banner
  - components/FourBurnersSheet.js — bottom sheet explainer
  - data-testids on every interactive element
- Dark theme (hsl 220 40% 8%) with electric blue + orange accents matching the original design.

## Backlog / Next
- P1: Hook up shareable chat transcripts at HiddenGeniusInvitational.com
- P1: Admin view for feedback + chat_logs
- P2: PWA install icons (full set), offline shell
- P2: Auth so sessions persist across devices

## Enhancement idea
Add a "Share this coaching moment" button after any thumbs-up reply — teens screenshot chats anyway; giving them a clean, branded share card drives organic growth for the Hidden Genius program.
