# Navigation & User-Flow Refactor — Developer Handoff

**Date:** November 2, 2026
**Branch:** `refactor/navigation-user-flow`
**Scope:** Frontend only (`frontend/src/App.js`, `JudgeView.js`, `WelcomeScreen.js`). No backend, API, or visual changes.

---

## What changed

### 1. Browser Back button now works inside the app (biggest UX fix)

**Before:** All in-app navigation was pure React state (`setScreen`). Pressing Back left the site entirely; a refresh dumped you back to home.

**After:** Every authed screen change mirrors into the URL hash as `#/screen/<name>` via `history.pushState`, and a `popstate` listener restores the screen. Net behavior:

- Back/Forward step through screens (home → chat → back to home) instead of exiting.
- Refresh on any screen restores that screen (hash is validated against the `AUTHED_SCREENS` allow-list).
- Logout clears the hash and resets the sync state, so Back never lands inside the authed app after sign-out.
- The first hash write per session is a `replaceState` (no phantom history entry).
- Auth callback's `session_id` hash usage is untouched — sync only runs for authed screens and skips while `session_id` is in the hash.

**Files:** `App.js` — `firstHashSync` ref, hash-sync effect, `popstate` effect, `readScreenFromHash()`, `AUTHED_SCREENS` set.

### 2. Public routing made declarative

The ten copy-pasted `if (route.type === ...)` blocks with duplicated wrapper divs are replaced by:

- `PUBLIC_PATH_ROUTES` — single path→route table (includes all `/aquidneck` aliases).
- `PUBLIC_SCREENS` — route type → `{ width, tall, render() }` config.
- `AppShell` — one shared wrapper component (`mobile` / `wide` / `full` variants) used by public routes **and** the authed app body.

`parsePath()` now handles only the dynamic routes (`/pitch/:slug`, `/judge?token=`) and looks static paths up in the table. **To add a public page:** one entry in each of the two tables.

### 3. Navigation logic deduplicated

- `renderHome()` — the HomeScreen was wired with two different prop sets (the fallback's `onContinueChat` went to `chat` without checking for a track); now one definition with the safe `user.current_track ? "chat" : "track"` check.
- `openMiles(from)` / `openGeniusStack(from)` — the persona-dependent Miles entry (`miles_persona ? miles_chat : miles_intro`) was inlined in 3 places; now one helper used by HomeScreen and ParentDashboard.
- `refreshUser()` now returns the fresh user so callers can route on it.

### 4. Bug fixes

- **Stale-closure in signup flow:** `SignupGate.onComplete` previously read `user.role` from the pre-refresh closure. It now uses the user returned by `refreshUser()` to route to `parent_home` vs `role_select`.
- **JudgeView fetch race:** the data-load effect now has a `cancelled` guard so a token change can't set state from a stale request (also fixed its `exhaustive-deps` lint error).
- **WelcomeScreen:** quote-rotation interval effect now declares its dependency (lint error fixed; no behavior change).

### 5. Dead code removed

- Unreachable `hasSessionInUrl && (user === null || user === false)` branch in the main body (an early return above already covered it).
- `screen === "onboarding"` branch — never set by any code path (`/story` route renders the component directly).
- `screen === "auth_callback"` check — `AuthCallback` only renders via the session-hash early return.

## Guarantee for existing tests

All `data-testid` attributes, page components, props, and the auth flow are unchanged. The hash-based history is additive. Screens render identically.

## Verification performed

- `npm run build` (CRA + craco) — compiles clean, zero eslint warnings (it previously failed CI on two pre-existing lint errors, now fixed).
- Served the production build; `/` and `/pitches` return 200.
- `mc_screen` history logic confirmed present in the built bundle.

## Recommended QA pass before merge

1. Sign in (Google) → verify landing on home and URL shows `#/screen/home`.
2. Home → Talk to Max → press Back → should return to home (not leave the site). Forward → chat again.
3. Refresh on `#/screen/chat` → should restore chat, not home.
4. Home → Workbook → a tool → Back → workbook.
5. Parent account: dashboard → Maya chat → Back → dashboard. Dashboard → Miles (persona set → chat; unset → intro).
6. Logout → Back → should not re-enter the authed app.
7. Public pages unaffected: `/pitches`, `/sponsor`, `/pricing`, `/aquidneck`, `/teachers`, `/story`, `/pitch/:slug`, `/judge?token=`, `/payment/return`.
8. Full Google OAuth round-trip (hash `session_id` exchange) — verify no interference from the new hash sync.

## Future work (out of scope, not changed)

- Public pages still hard-`href` between each other (full reloads). Could adopt the same hash router or move to `react-router-dom` (already in `package.json`) if deeper routing work is planned.
- `prevScreen` is still single-slot; deep flows (miles → genius stack → miles ideas) rely on hardcoded back targets.
- P3 refactor from PRD (splitting `server.py` into routers) remains untouched.
