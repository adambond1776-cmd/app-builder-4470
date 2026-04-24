"""End-to-end backend tests for Max Coach Phase 1A.

Covers: health, auth/me, profile, memory (get/put/delete),
chat (happy path, 401, 403, 429 daily cap, auto-summary trigger),
founding20 apply + status, feedback.
"""
import os
import time
import requests
from datetime import date, datetime, timezone

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://app-builder-4470.preview.emergentagent.com").rstrip("/")


# --- Health ---
class TestHealth:
    def test_health_ok(self, session):
        r = session.get(f"{BASE_URL}/api/health")
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert "time" in data


# --- Auth ---
class TestAuth:
    def test_me_no_token_returns_401(self, session):
        r = session.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401

    def test_me_invalid_token_returns_401(self, session, auth_headers):
        r = session.get(f"{BASE_URL}/api/auth/me", headers=auth_headers("not_a_real_token"))
        assert r.status_code == 401

    def test_me_valid_token_returns_user(self, session, seed_user, auth_headers):
        uid, tok = seed_user()
        r = session.get(f"{BASE_URL}/api/auth/me", headers=auth_headers(tok))
        assert r.status_code == 200
        data = r.json()
        # Critical fields required by the frontend
        for field in ["user_id", "email", "name", "age_confirmed", "beta_consent",
                      "documentary_interest", "current_track", "memory_card", "daily_count"]:
            assert field in data, f"missing {field}"
        assert data["user_id"] == uid
        assert data["age_confirmed"] is True
        assert data["beta_consent"] is True


# --- Profile ---
class TestProfile:
    def test_patch_profile_updates_fields(self, session, seed_user, auth_headers):
        uid, tok = seed_user(age_confirmed=False, beta_consent=False)
        payload = {
            "age_confirmed": True,
            "beta_consent": True,
            "documentary_interest": "yes",
            "current_track": "Work Track",
        }
        r = session.patch(f"{BASE_URL}/api/profile", json=payload, headers=auth_headers(tok))
        assert r.status_code == 200
        data = r.json()
        assert data["age_confirmed"] is True
        assert data["beta_consent"] is True
        assert data["documentary_interest"] == "yes"
        assert data["current_track"] == "Work Track"

        # Verify persistence
        r2 = session.get(f"{BASE_URL}/api/auth/me", headers=auth_headers(tok))
        assert r2.json()["current_track"] == "Work Track"


# --- Memory ---
class TestMemory:
    def test_memory_get_empty(self, session, seed_user, auth_headers):
        uid, tok = seed_user()
        r = session.get(f"{BASE_URL}/api/memory", headers=auth_headers(tok))
        assert r.status_code == 200
        assert r.json()["memory_card"] == ""

    def test_memory_put_and_get(self, session, seed_user, auth_headers):
        uid, tok = seed_user()
        txt = "User is in Grade 12, wants college, hot on school burner, cold on health."
        r = session.put(f"{BASE_URL}/api/memory", json={"memory_card": txt}, headers=auth_headers(tok))
        assert r.status_code == 200
        assert r.json()["memory_card"] == txt
        r2 = session.get(f"{BASE_URL}/api/memory", headers=auth_headers(tok))
        assert r2.json()["memory_card"] == txt

    def test_memory_delete_wipes(self, session, seed_user, auth_headers):
        uid, tok = seed_user(memory_card="existing note")
        r = session.delete(f"{BASE_URL}/api/memory", headers=auth_headers(tok))
        assert r.status_code == 200
        r2 = session.get(f"{BASE_URL}/api/memory", headers=auth_headers(tok))
        assert r2.json()["memory_card"] == ""


# --- Chat ---
class TestChat:
    def test_chat_requires_auth(self, session):
        r = session.post(f"{BASE_URL}/api/chat", json={"messages": [{"role": "user", "content": "hi"}]})
        assert r.status_code == 401

    def test_chat_403_if_age_or_consent_missing(self, session, seed_user, auth_headers):
        uid, tok = seed_user(age_confirmed=False, beta_consent=True)
        r = session.post(f"{BASE_URL}/api/chat",
                         json={"messages": [{"role": "user", "content": "hi"}], "track": "School Track"},
                         headers=auth_headers(tok))
        assert r.status_code == 403

        uid2, tok2 = seed_user(age_confirmed=True, beta_consent=False)
        r2 = session.post(f"{BASE_URL}/api/chat",
                          json={"messages": [{"role": "user", "content": "hi"}], "track": "School Track"},
                          headers=auth_headers(tok2))
        assert r2.status_code == 403

    def test_chat_happy_path(self, session, seed_user, auth_headers):
        uid, tok = seed_user()
        r = session.post(
            f"{BASE_URL}/api/chat",
            json={"messages": [{"role": "user", "content": "Hey Max, what's up?"}], "track": "School Track"},
            headers=auth_headers(tok),
            timeout=90,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data["message"], str) and len(data["message"]) > 0
        assert isinstance(data["remaining_today"], int)
        assert data["remaining_today"] == 29  # 30 cap - 1 used

    def test_chat_daily_cap_returns_429(self, session, seed_user, auth_headers):
        today = date.today().isoformat()
        uid, tok = seed_user(daily_count=30, daily_count_date=today)
        r = session.post(
            f"{BASE_URL}/api/chat",
            json={"messages": [{"role": "user", "content": "hi"}], "track": "School Track"},
            headers=auth_headers(tok),
            timeout=30,
        )
        assert r.status_code == 429
        assert "daily_cap_reached" in r.text


# --- Memory auto-summary ---
class TestMemoryAutoSummary:
    def test_memory_populated_after_6_exchanges(self, session, seed_user, auth_headers, mongo):
        """Seed 5 fake chat_logs + exchange_count=5, then fire 1 real chat to cross the threshold (6)."""
        uid, tok = seed_user(exchange_count=5)
        # Seed 5 prior chat_logs so the memory summarizer has real turns to read
        for i in range(5):
            mongo.chat_logs.insert_one({
                "id": f"seed_{uid}_{i}",
                "user_id": uid,
                "track": "School Track",
                "user": f"Prior user message {i}: I'm in grade 12, unsure about college.",
                "assistant": f"Prior Max reply {i}: Which burner is cold right now — health or self?",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
        r = session.post(
            f"{BASE_URL}/api/chat",
            json={"messages": [{"role": "user", "content": "Honestly I'm overwhelmed with school and don't sleep much."}],
                  "track": "School Track"},
            headers=auth_headers(tok),
            timeout=120,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        # memory_card should now be populated (non-empty)
        assert data.get("memory_card"), "memory_card should be populated after 6th exchange"
        # Confirm via GET /api/memory
        mr = session.get(f"{BASE_URL}/api/memory", headers=auth_headers(tok))
        assert mr.status_code == 200
        assert mr.json()["memory_card"]


# --- Founding 20 ---
class TestFounding20:
    def test_status_not_applied(self, session, seed_user, auth_headers):
        uid, tok = seed_user()
        r = session.get(f"{BASE_URL}/api/founding20/status", headers=auth_headers(tok))
        assert r.status_code == 200
        data = r.json()
        assert data["applied"] is False
        assert data["spots_cap"] == 20
        assert "total_applications" in data

    def test_apply_then_duplicate_400(self, session, seed_user, auth_headers):
        uid, tok = seed_user()
        payload = {
            "goal": "Get into college without losing my health or self burner",
            "why_me": "I show up every day and follow through on what I commit to",
            "payment_preference": "either",
        }
        r = session.post(f"{BASE_URL}/api/founding20/apply", json=payload, headers=auth_headers(tok))
        assert r.status_code == 200
        assert r.json()["ok"] is True

        # status reflects applied
        s = session.get(f"{BASE_URL}/api/founding20/status", headers=auth_headers(tok))
        assert s.json()["applied"] is True
        assert s.json()["application"]["goal"].startswith("Get into college")

        # second apply => 400
        r2 = session.post(f"{BASE_URL}/api/founding20/apply", json=payload, headers=auth_headers(tok))
        assert r2.status_code == 400
        assert "Already applied" in r2.text


# --- Feedback ---
class TestFeedback:
    def test_feedback_up(self, session, seed_user, auth_headers):
        uid, tok = seed_user()
        r = session.post(
            f"{BASE_URL}/api/feedback",
            json={"messageIndex": 1, "rating": "up", "track": "School Track", "preview": "nice reply"},
            headers=auth_headers(tok),
        )
        assert r.status_code == 200
        assert r.json()["ok"] is True

    def test_feedback_invalid_rating(self, session, seed_user, auth_headers):
        uid, tok = seed_user()
        r = session.post(
            f"{BASE_URL}/api/feedback",
            json={"messageIndex": 1, "rating": "meh", "track": "", "preview": ""},
            headers=auth_headers(tok),
        )
        assert r.status_code == 422
