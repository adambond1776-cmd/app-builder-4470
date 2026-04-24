"""Tests for Max Pitch Hub + Sponsor public endpoints (iteration 4).

Endpoints:
  GET  /api/pitch/public-stats     — no auth
  GET  /api/pitch/feed             — no auth (regression)
  POST /api/sponsor/inquire        — no auth, strict validation
  GET  /api/admin/sponsor/inquiries — admin-only

Plus a light regression probe on Max/Maya/Miles chat endpoints to confirm no route collision.
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://app-builder-4470.preview.emergentagent.com").rstrip("/")
ADMIN_TOKEN = "adm_1771f205fb49b1910a7172bc4f532d16"


# -----------------------------
# /api/pitch/public-stats
# -----------------------------
class TestPublicStats:
    def test_public_stats_no_auth_required(self):
        r = requests.get(f"{BASE_URL}/api/pitch/public-stats", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        # Keys contract
        for k in ["round_name", "round_deadline", "sponsor_name", "sponsor_url",
                  "total_pitches", "total_upvotes", "total_videos", "tracks"]:
            assert k in data, f"missing key {k}"
        assert isinstance(data["total_pitches"], int)
        assert isinstance(data["total_upvotes"], int)
        assert isinstance(data["total_videos"], int)
        assert isinstance(data["tracks"], list)

    def test_public_stats_reflects_seeded_pitches(self):
        r = requests.get(f"{BASE_URL}/api/pitch/public-stats", timeout=15)
        data = r.json()
        # 4 seeded pitches minimum for Round 1
        assert data["total_pitches"] >= 4, f"expected >=4 seeded pitches, got {data['total_pitches']}"
        # Upvotes 42+87+23+51 = 203 minimum from seed
        assert data["total_upvotes"] >= 203, f"expected >=203 upvotes, got {data['total_upvotes']}"
        # Jordan Reyes has youtube_url → at least 1 video
        assert data["total_videos"] >= 1
        # tracks list items shape
        if data["tracks"]:
            item = data["tracks"][0]
            assert "track" in item and "count" in item

    def test_public_stats_no_pii(self):
        r = requests.get(f"{BASE_URL}/api/pitch/public-stats", timeout=15)
        body = r.text
        # No user_id / email / _id leaking
        assert "user_id" not in body
        assert "_id" not in body


# -----------------------------
# /api/pitch/feed (regression)
# -----------------------------
class TestPitchFeedRegression:
    def test_feed_works_unauthed(self):
        r = requests.get(f"{BASE_URL}/api/pitch/feed", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "pitches" in data
        assert isinstance(data["pitches"], list)
        assert len(data["pitches"]) >= 4

    def test_feed_has_no_user_id_leakage(self):
        r = requests.get(f"{BASE_URL}/api/pitch/feed", timeout=15)
        data = r.json()
        for p in data["pitches"]:
            assert "user_id" not in p, f"user_id leaked in pitch {p.get('slug')}"
            assert "_id" not in p


# -----------------------------
# /api/sponsor/inquire
# -----------------------------
class TestSponsorInquire:
    def _payload(self, **overrides):
        base = {
            "name": "TEST_Reviewer",
            "company": "TEST_Acme Co",
            "email": f"TEST_{uuid.uuid4().hex[:8]}@example.com",
            "role": "Head of Marketing",
            "budget_tier": "10k_50k",
            "round_interest": "Round 1",
            "message": "We would love to sponsor this cohort and support the kids.",
        }
        base.update(overrides)
        return base

    def test_valid_submit(self, mongo):
        p = self._payload()
        r = requests.post(f"{BASE_URL}/api/sponsor/inquire", json=p, timeout=15)
        assert r.status_code == 200, r.text
        assert r.json() == {"ok": True}
        # Persistence check
        doc = mongo.sponsor_inquiries.find_one({"email": p["email"]})
        assert doc is not None
        assert doc["company"] == p["company"]
        assert doc["status"] == "new"
        assert doc["budget_tier"] == "10k_50k"

    def test_short_message_rejected(self):
        r = requests.post(f"{BASE_URL}/api/sponsor/inquire",
                          json=self._payload(message="too short"), timeout=15)
        assert r.status_code == 400

    def test_missing_at_email_rejected(self):
        r = requests.post(f"{BASE_URL}/api/sponsor/inquire",
                          json=self._payload(email="bademail.com"), timeout=15)
        assert r.status_code == 400

    def test_missing_tld_rejected(self):
        r = requests.post(f"{BASE_URL}/api/sponsor/inquire",
                          json=self._payload(email="bad@localhost"), timeout=15)
        assert r.status_code == 400

    def test_missing_required_fields(self):
        r = requests.post(f"{BASE_URL}/api/sponsor/inquire",
                          json={"name": "X", "company": "Y"}, timeout=15)
        # FastAPI pydantic returns 422 for missing required; endpoint raises 400 only after body parse
        assert r.status_code in (400, 422)

    def test_empty_name_rejected(self):
        r = requests.post(f"{BASE_URL}/api/sponsor/inquire",
                          json=self._payload(name="   "), timeout=15)
        assert r.status_code == 400

    def test_invalid_budget_tier_rejected(self):
        r = requests.post(f"{BASE_URL}/api/sponsor/inquire",
                          json=self._payload(budget_tier="mega"), timeout=15)
        assert r.status_code == 422  # pydantic Literal

    def test_optional_fields_omitted_ok(self, mongo):
        p = {
            "name": "TEST_Minimal",
            "company": "TEST_Minimal Co",
            "email": f"TEST_min_{uuid.uuid4().hex[:6]}@example.com",
            "message": "Minimal valid message that is long enough to pass.",
        }
        r = requests.post(f"{BASE_URL}/api/sponsor/inquire", json=p, timeout=15)
        assert r.status_code == 200
        doc = mongo.sponsor_inquiries.find_one({"email": p["email"]})
        assert doc is not None
        assert doc["role"] is None
        assert doc["budget_tier"] is None


# -----------------------------
# /api/admin/sponsor/inquiries
# -----------------------------
class TestAdminSponsorInquiries:
    def test_requires_admin_token(self):
        r = requests.get(f"{BASE_URL}/api/admin/sponsor/inquiries", timeout=15)
        assert r.status_code in (401, 403)

    def test_rejects_bad_token(self):
        r = requests.get(f"{BASE_URL}/api/admin/sponsor/inquiries",
                         headers={"X-Admin-Token": "wrong"}, timeout=15)
        assert r.status_code in (401, 403)

    def test_admin_lists_sorted_desc(self):
        # seed 2 inquiries
        emails = []
        for i in range(2):
            e = f"TEST_sort_{uuid.uuid4().hex[:6]}@example.com"
            emails.append(e)
            requests.post(f"{BASE_URL}/api/sponsor/inquire", json={
                "name": f"TEST_{i}",
                "company": "TEST_Sort Co",
                "email": e,
                "message": "Long enough message for sort ordering sanity.",
            }, timeout=15)
        r = requests.get(f"{BASE_URL}/api/admin/sponsor/inquiries",
                         headers={"X-Admin-Token": ADMIN_TOKEN}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "inquiries" in data and "total" in data
        assert data["total"] == len(data["inquiries"])
        # Sort desc by created_at
        ts = [i["created_at"] for i in data["inquiries"]]
        assert ts == sorted(ts, reverse=True)
        # our test emails appear
        seen = {i["email"] for i in data["inquiries"]}
        for e in emails:
            assert e in seen


# -----------------------------
# Regression probes — no collision
# -----------------------------
class TestNoRouteCollision:
    def test_max_chat_still_reachable(self):
        r = requests.post(f"{BASE_URL}/api/chat", json={"message": "hi"}, timeout=10)
        # unauthed → 401, NOT 404
        assert r.status_code in (401, 403)

    def test_maya_chat_still_reachable(self):
        r = requests.post(f"{BASE_URL}/api/family/chat", json={"message": "hi"}, timeout=10)
        assert r.status_code in (401, 403)

    def test_miles_chat_still_reachable(self):
        r = requests.post(f"{BASE_URL}/api/miles/chat",
                          json={"message": "hi", "subject": "math"}, timeout=10)
        assert r.status_code in (401, 403)


# -----------------------------
# Cleanup test-created inquiries
# -----------------------------
@pytest.fixture(scope="module", autouse=True)
def _cleanup_sponsor_inquiries(mongo):
    yield
    mongo.sponsor_inquiries.delete_many({"email": {"$regex": "^TEST_"}})
    mongo.sponsor_inquiries.delete_many({"company": {"$regex": "^TEST_"}})
