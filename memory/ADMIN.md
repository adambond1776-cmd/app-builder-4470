# Admin Endpoints — Quick Reference

Your admin token (keep this safe — don't commit or share):

```
ADMIN_TOKEN=adm_1771f205fb49b1910a7172bc4f532d16
```

Stored in `/app/backend/.env`. Rotate anytime by replacing the value in `.env` and restarting backend.

## 1. Stats snapshot — `/api/admin/stats`

```bash
curl -s -H "X-Admin-Token: adm_1771f205fb49b1910a7172bc4f532d16" \
  https://<your-deployed-url>/api/admin/stats | python3 -m json.tool
```

Returns JSON with:
- `users.total`, `users.fully_onboarded`
- `users.by_track` — School / Work / Trade / Figuring It Out / not_picked
- `users.documentary_interest` — yes / maybe / no / not_asked
- `founding_20.total_applications`, `founding_20.revenue_ready_leads` (paid_ok + either)
- `founding_20.paid_ok`, `either`, `free_only`, `pending_review`
- `engagement.total_chat_turns`, `feedback_positive`, `feedback_negative`

**Use this on sponsor pitch slide 3.** Pull it fresh before every meeting.

## 2. Founding 20 application CSV — `/api/admin/founding20/export.csv`

```bash
curl -s -H "X-Admin-Token: adm_1771f205fb49b1910a7172bc4f532d16" \
  "https://<your-deployed-url>/api/admin/founding20/export.csv" \
  -o founding20_applications.csv
open founding20_applications.csv  # opens in Excel/Numbers
```

Columns: `submitted_at, name, email, track, payment_preference, status, goal, why_me`

**Revenue play:** Filter for `payment_preference IN (paid_ok, either)` → email those applicants a Stripe Payment Link for cohort tuition → first revenue before Phase 1C ships.

## Security notes
- Never hit these from the frontend — they're for your CLI / spreadsheet / pitch prep
- Token travels in HTTP header (not a cookie), so no CSRF concern
- If you want to disable admin access temporarily, remove the `ADMIN_TOKEN` line from `.env` and restart backend

---

## Max Pitch — Admin Quick Reference

### Create a judge (generates a magic link token)
```bash
curl -X POST -H "X-Admin-Token: $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Judge Jane","email":"jane@example.com"}' \
  https://<your-url>/api/admin/pitch/judges
```
Response includes `magic_link_suffix` like `/judge?token=jt_xxx...` — append this to your deployed URL and send to the judge.

### List / deactivate judges
```bash
curl -H "X-Admin-Token: $ADMIN_TOKEN" https://<your-url>/api/admin/pitch/judges
curl -X DELETE -H "X-Admin-Token: $ADMIN_TOKEN" https://<your-url>/api/admin/pitch/judges/<judge_id>
```

### Match matrix (who wants to coach whom)
```bash
curl -H "X-Admin-Token: $ADMIN_TOKEN" https://<your-url>/api/admin/pitch/matrix
```
Returns every pitch with judge flags + interested_count, sorted by upvote count. This is your final-selection worksheet.

### Changing round settings
Edit `/app/backend/config.py`:
- `CURRENT_ROUND_NAME` — displayed everywhere
- `CURRENT_ROUND_DEADLINE` — ISO datetime string
- `CURRENT_ROUND_SPONSOR_NAME` / `CURRENT_ROUND_SPONSOR_URL` — appear on pitch pages when set
Restart backend: `sudo supervisorctl restart backend`

### Public pitch URL pattern
Each pitch lives at `<your-url>/pitch/<slug>` — kids share THAT link to rally upvotes. They don't share the app URL.
