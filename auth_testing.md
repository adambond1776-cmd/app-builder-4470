# Auth-Gated App Testing Playbook — Max Coach Phase 1A

Read this file fully before testing the app. Auth is Emergent-managed Google OAuth.

## Step 1: Create Test User & Session (direct Mongo insert)
```bash
mongosh --eval "
use('max_coach');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test Founder',
  picture: 'https://via.placeholder.com/150',
  age_confirmed: true,
  beta_consent: true,
  documentary_interest: 'maybe',
  current_track: null,
  memory_card: null,
  exchange_count_since_summary: 0,
  daily_count: 0,
  daily_count_date: null,
  founding_20_applied: false,
  created_at: new Date().toISOString()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"
```

## Step 2: Test Backend API
```bash
# auth/me
curl -X GET "$BACKEND/api/auth/me" -H "Authorization: Bearer $TOKEN"

# PATCH profile
curl -X PATCH "$BACKEND/api/profile" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"current_track":"School Track"}'

# chat (will actually call Claude)
curl -X POST "$BACKEND/api/chat" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hi Max"}],"track":"School Track"}'

# memory
curl -X GET "$BACKEND/api/memory" -H "Authorization: Bearer $TOKEN"

# founding 20
curl -X GET "$BACKEND/api/founding20/status" -H "Authorization: Bearer $TOKEN"
curl -X POST "$BACKEND/api/founding20/apply" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"goal":"Get into college without losing my health","why_me":"I show up every day and follow through","payment_preference":"either"}'
```

## Step 3: Browser Testing
Use Playwright to set session cookie and navigate:
```python
await page.context.add_cookies([{
    "name": "session_token",
    "value": "YOUR_TOKEN",
    "domain": "your-app.preview.emergentagent.com",
    "path": "/",
    "httpOnly": True,
    "secure": True,
    "sameSite": "None"
}])
await page.goto("https://app-builder-4470.preview.emergentagent.com")
```

## Cleanup
```bash
mongosh --eval "
use('max_coach');
db.users.deleteMany({email: /test\.user\./});
db.user_sessions.deleteMany({session_token: /test_session/});
db.chat_logs.deleteMany({user_id: /test-user-/});
db.founding_20_applications.deleteMany({user_id: /test-user-/});
"
```

## Success indicators
- ✅ `/api/auth/me` returns user data
- ✅ Home screen loads on valid cookie
- ✅ `/api/chat` returns a Max reply + `remaining_today` count
- ✅ `/api/memory` returns `{memory_card: ...}` (empty string when fresh)
- ✅ Founding 20 application persists, second POST returns 400 "Already applied"
- ✅ After 30 messages in one day, `/api/chat` returns 429 with `daily_cap_reached`

## Failure indicators
- ❌ 401 on `/api/auth/me` with valid token → check `session_token` cookie path & samesite
- ❌ 403 on `/api/chat` → user has not completed signup gate (`age_confirmed + beta_consent`)
- ❌ Memory card not updating after 6 exchanges → check SUMMARY_MODEL (Haiku) call is succeeding; look at backend logs
