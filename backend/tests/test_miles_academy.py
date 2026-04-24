"""End-to-end backend tests for Miles Academy (persona-based academic coach).

Covers:
- /api/miles/config — public config shape (brand, 3 personas, 9 subjects, pricing)
- /api/miles/me — persona gating defaults, remaining_today, daily_cap
- /api/miles/persona — sets persona + documentary + miles_onboarded_at; rejects invalid
- /api/miles/documentary — updates documentary interest
- /api/miles/chat — persona gate, happy path, subject-aware, limit_state transitions,
  miles_daily_count increments, memory card auto-build at 6th exchange, 429 cap.
- /api/miles/chat/history — messages array + remaining_today + daily_cap
- /api/miles/memory GET/PUT/DELETE
- /api/miles/ideas — category validation, min length
- /api/miles/polls + /vote — shape + voting persistence
- /api/miles/founding-status + /founding-signup — $9.50 price, 50 cap, slot lock
- Admin endpoints with X-Admin-Token
- REGRESSION: /api/chat (kid) & /api/family/chat (parent) counters isolated from Miles
"""
import os
from datetime import date
import uuid as _uuid
from datetime import datetime as _dt, timezone as _tz

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://app-builder-4470.preview.emergentagent.com").rstrip("/")
ADMIN_TOKEN = "adm_1771f205fb49b1910a7172bc4f532d16"


# ---- /api/miles/config (no auth) ----
class TestMilesConfig:
    def test_config_public_shape(self, session):
        r = session.get(f"{BASE_URL}/api/miles/config")
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["brand_name"] == "Miles Academy"
        assert d["founding_price"] == 9.5
        assert d["founding_cap"] == 50
        assert d["daily_cap"] == 30
        ids = {p["id"] for p in d["personas"]}
        assert ids == {"ivy", "vance", "drake"}
        for p in d["personas"]:
            assert p["display_name"] and p["tagline"] and p["sample_line"]
        assert len(d["subjects"]) == 9
        for s in ("math", "writing", "reading", "science", "history",
                  "languages", "test_prep", "college_apps", "general"):
            assert s in d["subjects"]


# ---- /api/miles/me ----
class TestMilesMe:
    def test_me_requires_onboarded(self, session, seed_user, auth_headers):
        _, tok = seed_user(role="parent", age_confirmed=False, beta_consent=False)
        r = session.get(f"{BASE_URL}/api/miles/me", headers=auth_headers(tok))
        assert r.status_code == 403

    def test_me_no_persona_defaults(self, session, seed_user, auth_headers):
        _, tok = seed_user(role="parent")
        r = session.get(f"{BASE_URL}/api/miles/me", headers=auth_headers(tok))
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["persona"] is None
        assert d["remaining_today"] == 30
        assert d["daily_cap"] == 30
        assert d["documentary_interest"] is None


# ---- /api/miles/persona ----
class TestMilesPersonaPick:
    def test_set_valid_persona(self, session, seed_user, auth_headers, mongo):
        uid, tok = seed_user(role="parent")
        r = session.post(f"{BASE_URL}/api/miles/persona",
                         json={"persona": "ivy", "documentary_interest": "maybe"},
                         headers=auth_headers(tok))
        assert r.status_code == 200, r.text
        u = mongo.users.find_one({"user_id": uid})
        assert u["miles_persona"] == "ivy"
        assert u["miles_documentary_interest"] == "maybe"
        assert u["miles_onboarded_at"] is not None

    def test_reject_invalid_persona_400(self, session, seed_user, auth_headers):
        _, tok = seed_user(role="parent")
        r = session.post(f"{BASE_URL}/api/miles/persona",
                         json={"persona": "bogus"}, headers=auth_headers(tok))
        assert r.status_code in (400, 422)

    def test_onboarded_at_not_overwritten_on_change(self, session, seed_user, auth_headers, mongo):
        uid, tok = seed_user(role="parent", miles_persona="ivy",
                             miles_onboarded_at="2024-01-01T00:00:00+00:00")
        r = session.post(f"{BASE_URL}/api/miles/persona",
                         json={"persona": "drake"}, headers=auth_headers(tok))
        assert r.status_code == 200
        u = mongo.users.find_one({"user_id": uid})
        assert u["miles_persona"] == "drake"
        assert u["miles_onboarded_at"] == "2024-01-01T00:00:00+00:00"


# ---- /api/miles/documentary ----
class TestMilesDocumentary:
    def test_update_documentary(self, session, seed_user, auth_headers, mongo):
        uid, tok = seed_user(role="parent")
        r = session.patch(f"{BASE_URL}/api/miles/documentary",
                          json={"documentary_interest": "yes"},
                          headers=auth_headers(tok))
        assert r.status_code == 200, r.text
        u = mongo.users.find_one({"user_id": uid})
        assert u["miles_documentary_interest"] == "yes"

    def test_invalid_value_rejected(self, session, seed_user, auth_headers):
        _, tok = seed_user(role="parent")
        r = session.patch(f"{BASE_URL}/api/miles/documentary",
                          json={"documentary_interest": "sure"},
                          headers=auth_headers(tok))
        assert r.status_code in (400, 422)


# ---- /api/miles/chat ----
class TestMilesChat:
    def test_requires_persona_400(self, session, seed_user, auth_headers):
        _, tok = seed_user(role="parent")
        r = session.post(f"{BASE_URL}/api/miles/chat",
                         json={"messages": [{"role": "user", "content": "hi"}]},
                         headers=auth_headers(tok))
        assert r.status_code == 400
        assert "persona" in r.text.lower()

    def test_not_onboarded_403(self, session, seed_user, auth_headers):
        _, tok = seed_user(role="parent", age_confirmed=False, beta_consent=False,
                           miles_persona="ivy")
        r = session.post(f"{BASE_URL}/api/miles/chat",
                         json={"messages": [{"role": "user", "content": "hi"}]},
                         headers=auth_headers(tok))
        assert r.status_code == 403

    def test_happy_path_normal_state(self, session, seed_user, auth_headers, mongo):
        uid, tok = seed_user(role="parent", miles_persona="ivy")
        r = session.post(f"{BASE_URL}/api/miles/chat",
                         json={"messages": [{"role": "user", "content": "I'm stuck on algebra, x^2-5x+6=0."}],
                               "subject": "math"},
                         headers=auth_headers(tok))
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("message", "remaining_today", "limit_state", "persona"):
            assert k in d
        assert isinstance(d["message"], str) and len(d["message"]) > 0
        assert d["remaining_today"] == 29
        assert d["limit_state"] == "normal"
        assert d["persona"] == "ivy"

        u = mongo.users.find_one({"user_id": uid})
        assert u["miles_daily_count"] == 1
        assert u["miles_daily_count_date"] == date.today().isoformat()
        # Kid + parent counters untouched
        assert u.get("daily_count", 0) == 0
        assert u.get("parent_daily_count", 0) == 0

        logs = list(mongo.miles_chat_logs.find({"user_id": uid}))
        assert len(logs) == 1
        assert logs[0]["persona"] == "ivy"
        assert logs[0]["subject"] == "math"


class TestMilesChatLimitStates:
    def test_approaching_at_10_or_less(self, session, seed_user, auth_headers):
        _, tok = seed_user(role="parent", miles_persona="vance",
                           miles_daily_count=21,
                           miles_daily_count_date=date.today().isoformat())
        r = session.post(f"{BASE_URL}/api/miles/chat",
                         json={"messages": [{"role": "user", "content": "quick check"}]},
                         headers=auth_headers(tok))
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["remaining_today"] == 8
        assert d["limit_state"] == "approaching"
        assert d["nudge"]

    def test_final_five_with_founding_nudge(self, session, seed_user, auth_headers):
        _, tok = seed_user(role="parent", miles_persona="drake",
                           miles_daily_count=27,
                           miles_daily_count_date=date.today().isoformat())
        r = session.post(f"{BASE_URL}/api/miles/chat",
                         json={"messages": [{"role": "user", "content": "one more q"}]},
                         headers=auth_headers(tok))
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["remaining_today"] == 2
        assert d["limit_state"] == "final_five"
        assert d["nudge"] and ("founding" in d["nudge"].lower() or "9.50" in d["nudge"])

    def test_exhausted_429(self, session, seed_user, auth_headers, mongo):
        uid, tok = seed_user(role="parent", miles_persona="ivy",
                             miles_daily_count=30,
                             miles_daily_count_date=date.today().isoformat())
        r = session.post(f"{BASE_URL}/api/miles/chat",
                         json={"messages": [{"role": "user", "content": "please"}]},
                         headers=auth_headers(tok))
        assert r.status_code == 429
        u = mongo.users.find_one({"user_id": uid})
        assert u["miles_daily_count"] == 30


class TestMilesMemoryAutoSummary:
    def test_memory_built_on_sixth_exchange(self, session, seed_user, auth_headers, mongo):
        uid, tok = seed_user(role="parent", miles_persona="drake",
                             miles_exchange_count=5)
        for i in range(5):
            mongo.miles_chat_logs.insert_one({
                "id": str(_uuid.uuid4()),
                "user_id": uid,
                "persona": "drake",
                "subject": "math",
                "user": f"prior miles turn {i}: struggling with calc derivatives",
                "assistant": f"prior drake reply {i}: Run 20 minutes of power rule drills now.",
                "timestamp": _dt.now(_tz.utc).isoformat(),
            })
        r = session.post(f"{BASE_URL}/api/miles/chat",
                         json={"messages": [{"role": "user", "content": "Test tomorrow, chain rule still shaky."}],
                               "subject": "math"},
                         headers=auth_headers(tok))
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("miles_memory_card")
        assert len(d["miles_memory_card"]) > 10
        u = mongo.users.find_one({"user_id": uid})
        assert u["miles_memory_card"]
        assert u["miles_exchange_count_since_summary"] == 0


# ---- /api/miles/chat/history ----
class TestMilesChatHistory:
    def test_empty_history(self, session, seed_user, auth_headers):
        _, tok = seed_user(role="parent", miles_persona="ivy")
        r = session.get(f"{BASE_URL}/api/miles/chat/history", headers=auth_headers(tok))
        assert r.status_code == 200
        d = r.json()
        assert "messages" in d and d["messages"] == []
        assert d["remaining_today"] == 30
        assert d["daily_cap"] == 30

    def test_history_contains_turns(self, session, seed_user, auth_headers, mongo):
        uid, tok = seed_user(role="parent", miles_persona="ivy")
        mongo.miles_chat_logs.insert_one({
            "id": str(_uuid.uuid4()),
            "user_id": uid,
            "persona": "ivy",
            "subject": "writing",
            "user": "help with thesis statement",
            "assistant": "Try leading with a claim.",
            "timestamp": _dt.now(_tz.utc).isoformat(),
        })
        r = session.get(f"{BASE_URL}/api/miles/chat/history", headers=auth_headers(tok))
        assert r.status_code == 200
        msgs = r.json()["messages"]
        assert len(msgs) >= 2
        roles = [m["role"] for m in msgs[:2]]
        assert "user" in roles and "assistant" in roles


# ---- /api/miles/memory GET/PUT/DELETE ----
class TestMilesMemoryCRUD:
    def test_get_empty(self, session, seed_user, auth_headers):
        _, tok = seed_user(role="parent", miles_persona="ivy")
        r = session.get(f"{BASE_URL}/api/miles/memory", headers=auth_headers(tok))
        assert r.status_code == 200
        assert r.json() == {"miles_memory_card": ""}

    def test_put_then_get(self, session, seed_user, auth_headers, mongo):
        uid, tok = seed_user(role="parent", miles_persona="ivy",
                             miles_exchange_count=4)
        payload = {"miles_memory_card": "TEST_ 9th grader, algebra 1, prep for finals."}
        r = session.put(f"{BASE_URL}/api/miles/memory", json=payload, headers=auth_headers(tok))
        assert r.status_code == 200
        g = session.get(f"{BASE_URL}/api/miles/memory", headers=auth_headers(tok)).json()
        assert g["miles_memory_card"] == payload["miles_memory_card"]
        u = mongo.users.find_one({"user_id": uid})
        assert u["miles_exchange_count_since_summary"] == 0

    def test_delete(self, session, seed_user, auth_headers, mongo):
        uid, tok = seed_user(role="parent", miles_persona="ivy",
                             miles_memory_card="TEST_ existing")
        r = session.delete(f"{BASE_URL}/api/miles/memory", headers=auth_headers(tok))
        assert r.status_code == 200
        assert session.get(f"{BASE_URL}/api/miles/memory",
                           headers=auth_headers(tok)).json()["miles_memory_card"] == ""


# ---- /api/miles/ideas ----
class TestMilesIdeas:
    def test_submit_valid_idea(self, session, seed_user, auth_headers, mongo):
        uid, tok = seed_user(role="parent", miles_persona="ivy")
        r = session.post(f"{BASE_URL}/api/miles/ideas",
                         json={"idea": "Add spaced-repetition flashcards per subject.",
                               "category": "format"},
                         headers=auth_headers(tok))
        assert r.status_code == 200, r.text
        stored = list(mongo.miles_ideas.find({"user_id": uid}))
        assert len(stored) == 1
        assert stored[0]["category"] == "format"

    def test_reject_short_idea(self, session, seed_user, auth_headers):
        _, tok = seed_user(role="parent", miles_persona="ivy")
        r = session.post(f"{BASE_URL}/api/miles/ideas",
                         json={"idea": "hi", "category": "other"},
                         headers=auth_headers(tok))
        assert r.status_code in (400, 422)

    def test_reject_invalid_category(self, session, seed_user, auth_headers):
        _, tok = seed_user(role="parent", miles_persona="ivy")
        r = session.post(f"{BASE_URL}/api/miles/ideas",
                         json={"idea": "some long enough idea text", "category": "bogus"},
                         headers=auth_headers(tok))
        assert r.status_code in (400, 422)


# ---- /api/miles/polls + vote ----
class TestMilesPolls:
    def test_get_polls_shape(self, session, seed_user, auth_headers):
        _, tok = seed_user(role="parent", miles_persona="ivy")
        r = session.get(f"{BASE_URL}/api/miles/polls", headers=auth_headers(tok))
        assert r.status_code == 200, r.text
        d = r.json()
        assert "options" in d
        ids = {o["id"] for o in d["options"]}
        assert "curriculum_planner" in ids
        assert "standards_alignment" in ids

    def test_vote_persists(self, session, seed_user, auth_headers, mongo):
        uid, tok = seed_user(role="parent", miles_persona="ivy")
        r = session.post(f"{BASE_URL}/api/miles/polls/vote",
                         json={"option_ids": ["curriculum_planner", "live_tutor_sessions"]},
                         headers=auth_headers(tok))
        assert r.status_code == 200, r.text
        v = mongo.miles_poll_votes.find_one({"user_id": uid})
        assert v is not None
        assert set(v["option_ids"]) == {"curriculum_planner", "live_tutor_sessions"}


# ---- /api/miles/founding-status & signup ----
class TestMilesFounding:
    def test_status_shape(self, session, seed_user, auth_headers):
        _, tok = seed_user(role="parent", miles_persona="ivy")
        r = session.get(f"{BASE_URL}/api/miles/founding-status", headers=auth_headers(tok))
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("price") == 9.5 or d.get("founding_price") == 9.5
        # cap should be 50
        assert d.get("cap", d.get("founding_cap")) == 50

    def test_signup_requires_agreement(self, session, seed_user, auth_headers):
        _, tok = seed_user(role="parent", miles_persona="ivy")
        r = session.post(f"{BASE_URL}/api/miles/founding-signup",
                         json={"agrees_to_founding_terms": False},
                         headers=auth_headers(tok))
        assert r.status_code in (400, 422)

    def test_signup_locks_slot(self, session, seed_user, auth_headers, mongo):
        uid, tok = seed_user(role="parent", miles_persona="ivy")
        r = session.post(f"{BASE_URL}/api/miles/founding-signup",
                         json={"agrees_to_founding_terms": True},
                         headers=auth_headers(tok))
        assert r.status_code == 200, r.text
        sig = mongo.miles_founding_signups.find_one({"user_id": uid})
        assert sig is not None
        assert isinstance(sig.get("slot_number"), int)
        assert sig["slot_number"] >= 1


# ---- Admin endpoints ----
class TestMilesAdmin:
    def test_requires_token(self, session):
        r = session.get(f"{BASE_URL}/api/admin/miles/ideas")
        assert r.status_code in (401, 403)

    def test_admin_ideas_list(self, session):
        r = session.get(f"{BASE_URL}/api/admin/miles/ideas",
                        headers={"X-Admin-Token": ADMIN_TOKEN})
        assert r.status_code == 200

    def test_admin_polls(self, session):
        r = session.get(f"{BASE_URL}/api/admin/miles/polls",
                        headers={"X-Admin-Token": ADMIN_TOKEN})
        assert r.status_code == 200

    def test_admin_founding(self, session):
        r = session.get(f"{BASE_URL}/api/admin/miles/founding",
                        headers={"X-Admin-Token": ADMIN_TOKEN})
        assert r.status_code == 200

    def test_admin_documentary(self, session):
        r = session.get(f"{BASE_URL}/api/admin/miles/documentary-interest",
                        headers={"X-Admin-Token": ADMIN_TOKEN})
        assert r.status_code == 200


# ---- REGRESSION: counter isolation ----
class TestCounterIsolation:
    def test_miles_chat_does_not_touch_parent_or_kid_counters(self, session, seed_user, auth_headers, mongo):
        uid, tok = seed_user(role="parent", miles_persona="ivy")
        r = session.post(f"{BASE_URL}/api/miles/chat",
                         json={"messages": [{"role": "user", "content": "quick Q on fractions"}],
                               "subject": "math"},
                         headers=auth_headers(tok))
        assert r.status_code == 200
        u = mongo.users.find_one({"user_id": uid})
        assert u["miles_daily_count"] == 1
        assert u.get("daily_count", 0) == 0
        assert u.get("parent_daily_count", 0) == 0

    def test_parent_family_chat_still_works(self, session, seed_user, auth_headers, mongo):
        uid, tok = seed_user(role="parent", miles_persona="ivy")
        r = session.post(f"{BASE_URL}/api/family/chat",
                         json={"messages": [{"role": "user", "content": "my teen won't talk"}]},
                         headers=auth_headers(tok))
        assert r.status_code == 200, r.text
        u = mongo.users.find_one({"user_id": uid})
        assert u["parent_daily_count"] == 1
        assert u.get("miles_daily_count", 0) == 0
