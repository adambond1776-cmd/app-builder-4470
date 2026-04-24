"""End-to-end backend tests for Maya — Parent Coach (Family OS).

Covers:
- /api/family/chat — role gating (kid blocked), onboarding gating, happy path,
  limit_state transitions, nudge banners, bad last-message role (400),
  parent_daily_count increments, memory card auto-build at 6th exchange, 429 cap.
- /api/family/chat/history — role gating, response shape.
- /api/family/memory GET/PUT/DELETE — role gating + persistence.
- Regression: /api/chat (kid) still works and does not mutate parent counters.
"""
import os
from datetime import date
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://app-builder-4470.preview.emergentagent.com").rstrip("/")


# ------------ /api/family/chat — role & onboarding gates ------------
class TestFamilyChatGates:
    def test_kid_role_blocked_403(self, session, seed_user, auth_headers):
        _, tok = seed_user(role="kid")
        r = session.post(f"{BASE_URL}/api/family/chat",
                         json={"messages": [{"role": "user", "content": "hi maya"}]},
                         headers=auth_headers(tok))
        assert r.status_code == 403, r.text
        assert "parent" in r.text.lower()

    def test_parent_not_onboarded_blocked_403(self, session, seed_user, auth_headers):
        _, tok = seed_user(role="parent", age_confirmed=False, beta_consent=False)
        r = session.post(f"{BASE_URL}/api/family/chat",
                         json={"messages": [{"role": "user", "content": "hi"}]},
                         headers=auth_headers(tok))
        assert r.status_code == 403
        assert "onboarding" in r.text.lower()

    def test_no_token_returns_401(self, session):
        r = session.post(f"{BASE_URL}/api/family/chat",
                         json={"messages": [{"role": "user", "content": "hi"}]})
        assert r.status_code == 401

    def test_last_message_not_user_returns_400(self, session, seed_user, auth_headers):
        _, tok = seed_user(role="parent")
        r = session.post(
            f"{BASE_URL}/api/family/chat",
            json={"messages": [
                {"role": "user", "content": "hey"},
                {"role": "assistant", "content": "hi parent"},
            ]},
            headers=auth_headers(tok),
        )
        assert r.status_code == 400
        assert "user" in r.text.lower()

    def test_empty_messages_returns_400(self, session, seed_user, auth_headers):
        _, tok = seed_user(role="parent")
        r = session.post(f"{BASE_URL}/api/family/chat", json={"messages": []},
                         headers=auth_headers(tok))
        assert r.status_code == 400


# ------------ /api/family/chat — happy path + counters ------------
class TestFamilyChatHappyPath:
    def test_parent_first_message_normal_state(self, session, seed_user, auth_headers, mongo):
        uid, tok = seed_user(role="parent")
        r = session.post(f"{BASE_URL}/api/family/chat",
                         json={"messages": [{"role": "user", "content": "My teen slammed the door again. Where do I start?"}]},
                         headers=auth_headers(tok))
        assert r.status_code == 200, r.text
        data = r.json()
        # Shape
        for k in ("message", "remaining_today", "limit_state"):
            assert k in data
        assert isinstance(data["message"], str) and len(data["message"]) > 0
        assert data["remaining_today"] == 29
        assert data["limit_state"] == "normal"
        assert data.get("nudge") in (None, "")

        # Counter persisted
        u = mongo.users.find_one({"user_id": uid})
        assert u["parent_daily_count"] == 1
        assert u["parent_daily_count_date"] == date.today().isoformat()
        # Kid counters untouched
        assert u.get("daily_count", 0) == 0

        # Chat log persisted
        logs = list(mongo.parent_chat_logs.find({"user_id": uid}))
        assert len(logs) == 1
        assert logs[0]["user"].startswith("My teen slammed")


# ------------ /api/family/chat — limit_state transitions (no LLM calls) ------------
class TestFamilyChatLimitStates:
    """We pre-seed parent_daily_count to land in the target bucket after 1 call."""

    def test_approaching_state_at_10_remaining(self, session, seed_user, auth_headers):
        # Seed 21 used → after reply: 22 used → remaining=8 → approaching
        _, tok = seed_user(role="parent",
                           parent_daily_count=21,
                           parent_daily_count_date=date.today().isoformat())
        r = session.post(f"{BASE_URL}/api/family/chat",
                         json={"messages": [{"role": "user", "content": "Tuesdays are chaos."}]},
                         headers=auth_headers(tok))
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["remaining_today"] == 8
        assert data["limit_state"] == "approaching"
        assert data["nudge"] and "messages left" in data["nudge"].lower()

    def test_final_five_state_with_founding_nudge(self, session, seed_user, auth_headers):
        # Seed 27 used → after reply: 28 used → remaining=2 → final_five
        _, tok = seed_user(role="parent",
                           parent_daily_count=27,
                           parent_daily_count_date=date.today().isoformat())
        r = session.post(f"{BASE_URL}/api/family/chat",
                         json={"messages": [{"role": "user", "content": "One more thing today."}]},
                         headers=auth_headers(tok))
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["remaining_today"] == 2
        assert data["limit_state"] == "final_five"
        assert data["nudge"] and "founding" in data["nudge"].lower()

    def test_exhausted_returns_429(self, session, seed_user, auth_headers, mongo):
        uid, tok = seed_user(role="parent",
                             parent_daily_count=30,
                             parent_daily_count_date=date.today().isoformat())
        r = session.post(f"{BASE_URL}/api/family/chat",
                         json={"messages": [{"role": "user", "content": "please"}]},
                         headers=auth_headers(tok))
        assert r.status_code == 429
        assert "daily_cap" in r.text.lower() or "cap" in r.text.lower()
        # Counter unchanged
        u = mongo.users.find_one({"user_id": uid})
        assert u["parent_daily_count"] == 30


# ------------ /api/family/chat — memory card auto-build at 6th exchange ------------
class TestFamilyMemoryAutoSummary:
    def test_memory_card_built_on_sixth_exchange(self, session, seed_user, auth_headers, mongo):
        uid, tok = seed_user(role="parent", parent_exchange_count=5)
        # Seed 5 prior parent_chat_logs so the summarizer has content
        import uuid as _uuid
        from datetime import datetime as _dt, timezone as _tz
        for i in range(5):
            mongo.parent_chat_logs.insert_one({
                "id": str(_uuid.uuid4()),
                "user_id": uid,
                "user": f"prior parent turn {i}: I'm juggling two kids and a new job",
                "assistant": f"prior maya turn {i}: Name the one burner leaking this week.",
                "timestamp": _dt.now(_tz.utc).isoformat(),
            })
        r = session.post(f"{BASE_URL}/api/family/chat",
                         json={"messages": [{"role": "user", "content": "Co-parent and I keep arguing about screen time."}]},
                         headers=auth_headers(tok))
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("parent_memory_card"), "parent_memory_card should be populated after 6th exchange"
        assert isinstance(data["parent_memory_card"], str) and len(data["parent_memory_card"]) > 10

        # Persisted + counter reset
        u = mongo.users.find_one({"user_id": uid})
        assert u["parent_memory_card"]
        assert u["parent_exchange_count_since_summary"] == 0


# ------------ /api/family/chat/history ------------
class TestFamilyChatHistory:
    def test_kid_blocked_403(self, session, seed_user, auth_headers):
        _, tok = seed_user(role="kid")
        r = session.get(f"{BASE_URL}/api/family/chat/history", headers=auth_headers(tok))
        assert r.status_code == 403

    def test_empty_history_for_new_parent(self, session, seed_user, auth_headers):
        _, tok = seed_user(role="parent")
        r = session.get(f"{BASE_URL}/api/family/chat/history", headers=auth_headers(tok))
        assert r.status_code == 200
        data = r.json()
        # Backend returns `messages` (turns array) + remaining_today + daily_cap
        assert "messages" in data
        assert isinstance(data["messages"], list)
        assert data["messages"] == []
        assert data["remaining_today"] == 30
        assert data["daily_cap"] == 30

    def test_history_returns_recent_turns(self, session, seed_user, auth_headers, mongo):
        uid, tok = seed_user(role="parent")
        import uuid as _uuid
        from datetime import datetime as _dt, timezone as _tz
        mongo.parent_chat_logs.insert_one({
            "id": str(_uuid.uuid4()),
            "user_id": uid,
            "user": "prior parent msg",
            "assistant": "prior maya msg",
            "timestamp": _dt.now(_tz.utc).isoformat(),
        })
        r = session.get(f"{BASE_URL}/api/family/chat/history", headers=auth_headers(tok))
        assert r.status_code == 200
        msgs = r.json()["messages"]
        assert len(msgs) == 2
        assert msgs[0]["role"] == "user"
        assert msgs[0]["content"] == "prior parent msg"
        assert msgs[1]["role"] == "assistant"
        assert msgs[1]["content"] == "prior maya msg"


# ------------ /api/family/memory GET/PUT/DELETE ------------
class TestFamilyMemoryCRUD:
    def test_kid_blocked_on_all_memory_endpoints(self, session, seed_user, auth_headers):
        _, tok = seed_user(role="kid")
        assert session.get(f"{BASE_URL}/api/family/memory", headers=auth_headers(tok)).status_code == 403
        assert session.put(f"{BASE_URL}/api/family/memory",
                           json={"parent_memory_card": "x"},
                           headers=auth_headers(tok)).status_code == 403
        assert session.delete(f"{BASE_URL}/api/family/memory", headers=auth_headers(tok)).status_code == 403

    def test_get_returns_empty_string_when_none(self, session, seed_user, auth_headers):
        _, tok = seed_user(role="parent")
        r = session.get(f"{BASE_URL}/api/family/memory", headers=auth_headers(tok))
        assert r.status_code == 200
        assert r.json() == {"parent_memory_card": ""}

    def test_put_then_get_persists(self, session, seed_user, auth_headers, mongo):
        uid, tok = seed_user(role="parent", parent_exchange_count=4)
        payload = {"parent_memory_card": "TEST_ Parent of 15yo + 11yo. Works hospitality nights."}
        r = session.put(f"{BASE_URL}/api/family/memory", json=payload, headers=auth_headers(tok))
        assert r.status_code == 200
        assert r.json()["parent_memory_card"] == payload["parent_memory_card"]
        # GET reflects new state
        g = session.get(f"{BASE_URL}/api/family/memory", headers=auth_headers(tok)).json()
        assert g["parent_memory_card"] == payload["parent_memory_card"]
        # Exchange counter reset
        u = mongo.users.find_one({"user_id": uid})
        assert u["parent_exchange_count_since_summary"] == 0

    def test_delete_resets_card(self, session, seed_user, auth_headers, mongo):
        uid, tok = seed_user(role="parent", parent_memory_card="TEST_ existing")
        r = session.delete(f"{BASE_URL}/api/family/memory", headers=auth_headers(tok))
        assert r.status_code == 200
        g = session.get(f"{BASE_URL}/api/family/memory", headers=auth_headers(tok)).json()
        assert g["parent_memory_card"] == ""
        u = mongo.users.find_one({"user_id": uid})
        assert u["parent_memory_card"] is None


# ------------ Regression: /api/chat (kid) still works & parent counters isolated ------------
class TestKidChatRegression:
    def test_kid_chat_works_and_does_not_touch_parent_counters(self, session, seed_user, auth_headers, mongo):
        uid, tok = seed_user(role="kid")
        r = session.post(f"{BASE_URL}/api/chat",
                         json={"messages": [{"role": "user", "content": "what do I do when I'm stuck?"}],
                               "track": "School Track"},
                         headers=auth_headers(tok))
        assert r.status_code == 200, r.text
        data = r.json()
        assert "message" in data and isinstance(data["message"], str) and len(data["message"]) > 0
        u = mongo.users.find_one({"user_id": uid})
        assert u["daily_count"] == 1
        # Parent counters must NOT change
        assert u.get("parent_daily_count", 0) == 0
        assert u.get("parent_daily_count_date") in (None, "")
