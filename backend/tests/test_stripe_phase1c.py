"""Phase 1C — Stripe Checkout + Boosters + Founding locks + Sponsor tiers + Lead Partner intake."""
import os
import sys
import uuid
import asyncio
from datetime import datetime, timezone, timedelta

import pytest
import requests

# Allow importing server module to call _credit_transaction directly
sys.path.insert(0, "/app/backend")

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://app-builder-4470.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

PARENT_TOKEN = "test_parent_1777042439177"
PARENT_USER_ID = "user_dz3o51yo4yk"
ADMIN_TOKEN = "adm_1771f205fb49b1910a7172bc4f532d16"

EXPECTED_PRODUCTS = {
    "booster_max_30": (2.99, "booster", "max"),
    "booster_maya_30": (2.99, "booster", "maya"),
    "booster_miles_30": (2.99, "booster", "miles"),
    "founding_family_lock": (14.50, "founding_lock", "family"),
    "founding_miles_lock": (9.50, "founding_lock", "miles"),
    "sponsor_spotlight": (5000.00, "sponsor", "spotlight"),
    "sponsor_anchor": (15000.00, "sponsor", "anchor"),
}


# -------- Products listing --------
def test_products_public():
    r = requests.get(f"{API}/stripe/products", timeout=20)
    assert r.status_code == 200
    data = r.json()
    assert "products" in data
    by_id = {p["product_id"]: p for p in data["products"]}
    assert len(by_id) == 7
    for pid, (amount, kind, target) in EXPECTED_PRODUCTS.items():
        assert pid in by_id, f"Missing product {pid}"
        assert by_id[pid]["amount"] == amount
        assert by_id[pid]["kind"] == kind
        assert by_id[pid]["target"] == target
        assert by_id[pid]["currency"] == "usd"
        assert by_id[pid]["name"]


# -------- Checkout auth gating --------
def test_checkout_booster_requires_auth():
    r = requests.post(f"{API}/stripe/checkout", json={
        "product_id": "booster_maya_30",
        "origin_url": BASE_URL,
    }, timeout=20)
    assert r.status_code == 401


def test_checkout_founding_requires_auth():
    r = requests.post(f"{API}/stripe/checkout", json={
        "product_id": "founding_family_lock",
        "origin_url": BASE_URL,
    }, timeout=20)
    assert r.status_code == 401


def test_checkout_unknown_product():
    r = requests.post(f"{API}/stripe/checkout", json={
        "product_id": "does_not_exist",
        "origin_url": BASE_URL,
    }, timeout=20)
    assert r.status_code == 400


def test_checkout_invalid_origin():
    r = requests.post(f"{API}/stripe/checkout", json={
        "product_id": "sponsor_spotlight",
        "origin_url": "ftp://bad.example.com",
    }, timeout=20)
    assert r.status_code == 400


def test_checkout_sponsor_public_creates_session(mongo):
    r = requests.post(f"{API}/stripe/checkout", json={
        "product_id": "sponsor_spotlight",
        "origin_url": BASE_URL,
        "sponsor_email": "TEST_sponsor@example.com",
        "sponsor_name": "TEST Sponsor",
    }, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "url" in data and data["url"].startswith("http")
    assert "session_id" in data and data["session_id"].startswith("cs_")
    # Persisted in Mongo
    tx = mongo.payment_transactions.find_one({"session_id": data["session_id"]})
    assert tx is not None
    assert tx["product_id"] == "sponsor_spotlight"
    assert tx["amount"] == 5000.00
    assert tx["status"] == "initiated"
    assert tx["credited"] is False
    # cleanup
    mongo.payment_transactions.delete_many({"session_id": data["session_id"]})


def test_checkout_booster_authed_creates_session(mongo):
    r = requests.post(f"{API}/stripe/checkout",
        headers={"Authorization": f"Bearer {PARENT_TOKEN}"},
        json={"product_id": "booster_maya_30", "origin_url": BASE_URL},
        timeout=30,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["session_id"].startswith("cs_")
    tx = mongo.payment_transactions.find_one({"session_id": data["session_id"]})
    assert tx is not None
    assert tx["user_id"] == PARENT_USER_ID
    assert tx["kind"] == "booster"
    assert tx["target"] == "maya"
    mongo.payment_transactions.delete_many({"session_id": data["session_id"]})


# -------- _credit_transaction direct invocation (import server module) --------
# Single persistent event loop so motor (async MongoDB) uses the same loop across tests
_SHARED_LOOP = asyncio.new_event_loop()
asyncio.set_event_loop(_SHARED_LOOP)


def _run(coro):
    return _SHARED_LOOP.run_until_complete(coro)


def test_credit_booster_maya_adds_200(mongo):
    import server as srv
    # reset counter
    mongo.users.update_one({"user_id": PARENT_USER_ID}, {"$set": {"parent_boosters_remaining": 0}})
    sid = f"cs_test_{uuid.uuid4().hex[:12]}"
    tx = {
        "session_id": sid,
        "user_id": PARENT_USER_ID,
        "user_email": "parent.test@example.com",
        "kind": "booster", "target": "maya",
        "amount": 2.99, "metadata": {"user_id": PARENT_USER_ID},
        "credited": False,
    }
    mongo.payment_transactions.insert_one(dict(tx))
    _run(srv._credit_transaction(tx))
    u = mongo.users.find_one({"user_id": PARENT_USER_ID})
    assert u["parent_boosters_remaining"] == 200
    # Idempotency — call again after refreshing tx from DB
    fresh = mongo.payment_transactions.find_one({"session_id": sid}, {"_id": 0})
    assert fresh["credited"] is True
    _run(srv._credit_transaction(fresh))
    u2 = mongo.users.find_one({"user_id": PARENT_USER_ID})
    assert u2["parent_boosters_remaining"] == 200  # unchanged
    mongo.payment_transactions.delete_many({"session_id": sid})
    mongo.users.update_one({"user_id": PARENT_USER_ID}, {"$set": {"parent_boosters_remaining": 0}})


def test_credit_booster_max_adds_200(mongo):
    import server as srv
    mongo.users.update_one({"user_id": PARENT_USER_ID}, {"$set": {"max_boosters_remaining": 0}})
    sid = f"cs_test_{uuid.uuid4().hex[:12]}"
    tx = {"session_id": sid, "user_id": PARENT_USER_ID, "kind": "booster", "target": "max",
          "amount": 2.99, "metadata": {}, "credited": False}
    mongo.payment_transactions.insert_one(dict(tx))
    _run(srv._credit_transaction(tx))
    u = mongo.users.find_one({"user_id": PARENT_USER_ID})
    assert u["max_boosters_remaining"] == 200
    mongo.payment_transactions.delete_many({"session_id": sid})
    mongo.users.update_one({"user_id": PARENT_USER_ID}, {"$set": {"max_boosters_remaining": 0}})


def test_credit_booster_miles_adds_200(mongo):
    import server as srv
    mongo.users.update_one({"user_id": PARENT_USER_ID}, {"$set": {"miles_boosters_remaining": 0}})
    sid = f"cs_test_{uuid.uuid4().hex[:12]}"
    tx = {"session_id": sid, "user_id": PARENT_USER_ID, "kind": "booster", "target": "miles",
          "amount": 2.99, "metadata": {}, "credited": False}
    mongo.payment_transactions.insert_one(dict(tx))
    _run(srv._credit_transaction(tx))
    u = mongo.users.find_one({"user_id": PARENT_USER_ID})
    assert u["miles_boosters_remaining"] == 200
    mongo.payment_transactions.delete_many({"session_id": sid})
    mongo.users.update_one({"user_id": PARENT_USER_ID}, {"$set": {"miles_boosters_remaining": 0}})


def test_credit_founding_family_lock(mongo):
    import server as srv
    mongo.users.update_one({"user_id": PARENT_USER_ID}, {"$set": {"family_founding_locked_until": None}})
    mongo.family_founding_signups.delete_many({"user_id": PARENT_USER_ID})
    sid = f"cs_test_{uuid.uuid4().hex[:12]}"
    tx = {"session_id": sid, "user_id": PARENT_USER_ID, "user_email": "parent.test@example.com",
          "kind": "founding_lock", "target": "family", "amount": 14.50, "metadata": {}, "credited": False}
    mongo.payment_transactions.insert_one(dict(tx))
    _run(srv._credit_transaction(tx))
    u = mongo.users.find_one({"user_id": PARENT_USER_ID})
    assert u["family_founding_locked_until"] is not None
    lock = datetime.fromisoformat(u["family_founding_locked_until"])
    delta_days = (lock - datetime.now(timezone.utc)).days
    assert 360 <= delta_days <= 366
    signup = mongo.family_founding_signups.find_one({"user_id": PARENT_USER_ID})
    assert signup is not None
    assert signup["status"] == "paid"
    # cleanup
    mongo.payment_transactions.delete_many({"session_id": sid})
    mongo.users.update_one({"user_id": PARENT_USER_ID}, {"$set": {"family_founding_locked_until": None}})
    mongo.family_founding_signups.delete_many({"user_id": PARENT_USER_ID})


def test_credit_founding_miles_lock(mongo):
    import server as srv
    mongo.users.update_one({"user_id": PARENT_USER_ID}, {"$set": {"miles_founding_locked_until": None}})
    mongo.miles_founding_signups.delete_many({"user_id": PARENT_USER_ID})
    sid = f"cs_test_{uuid.uuid4().hex[:12]}"
    tx = {"session_id": sid, "user_id": PARENT_USER_ID, "user_email": "parent.test@example.com",
          "kind": "founding_lock", "target": "miles", "amount": 9.50, "metadata": {}, "credited": False}
    mongo.payment_transactions.insert_one(dict(tx))
    _run(srv._credit_transaction(tx))
    u = mongo.users.find_one({"user_id": PARENT_USER_ID})
    assert u["miles_founding_locked_until"] is not None
    signup = mongo.miles_founding_signups.find_one({"user_id": PARENT_USER_ID})
    assert signup is not None
    assert signup["status"] == "paid"
    mongo.payment_transactions.delete_many({"session_id": sid})
    mongo.users.update_one({"user_id": PARENT_USER_ID}, {"$set": {"miles_founding_locked_until": None}})
    mongo.miles_founding_signups.delete_many({"user_id": PARENT_USER_ID})


def test_credit_sponsor_updates_inquiry(mongo):
    import server as srv
    inquiry_id = f"TEST_inq_{uuid.uuid4().hex[:10]}"
    mongo.sponsor_inquiries.insert_one({
        "id": inquiry_id, "name": "TEST", "email": "TEST_s@example.com",
        "company": "Acme", "budget_tier": "50k_plus", "status": "new",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    sid = f"cs_test_{uuid.uuid4().hex[:12]}"
    tx = {"session_id": sid, "user_id": None, "kind": "sponsor", "target": "spotlight",
          "amount": 5000.00, "sponsor_inquiry_id": inquiry_id,
          "metadata": {"sponsor_inquiry_id": inquiry_id}, "credited": False}
    mongo.payment_transactions.insert_one(dict(tx))
    _run(srv._credit_transaction(tx))
    inq = mongo.sponsor_inquiries.find_one({"id": inquiry_id})
    assert inq["status"] == "paid"
    assert inq["tier_purchased"] == "spotlight"
    assert inq["amount_paid"] == 5000.00
    assert inq["stripe_session_id"] == sid
    mongo.payment_transactions.delete_many({"session_id": sid})
    mongo.sponsor_inquiries.delete_many({"id": inquiry_id})


# -------- Booster consumption in chat (Maya) --------
def test_maya_booster_consumption_at_cap(mongo):
    """When parent_daily_count=30 AND parent_boosters_remaining=200, chat succeeds, booster decrements."""
    today = datetime.now(timezone.utc).date().isoformat()
    mongo.users.update_one({"user_id": PARENT_USER_ID}, {"$set": {
        "parent_daily_count": 30,
        "parent_daily_count_date": today,
        "parent_boosters_remaining": 200,
    }})
    r = requests.post(f"{API}/family/chat",
        headers={"Authorization": f"Bearer {PARENT_TOKEN}"},
        json={"messages": [{"role": "user", "content": "TEST booster — one short reply."}]},
        timeout=60,
    )
    assert r.status_code == 200, r.text
    u = mongo.users.find_one({"user_id": PARENT_USER_ID})
    assert u["parent_boosters_remaining"] == 199
    assert u["parent_daily_count"] == 31
    # reset
    mongo.users.update_one({"user_id": PARENT_USER_ID}, {"$set": {
        "parent_daily_count": 0, "parent_daily_count_date": None,
        "parent_boosters_remaining": 0,
    }})


def test_maya_booster_exhausted_returns_429(mongo):
    today = datetime.now(timezone.utc).date().isoformat()
    mongo.users.update_one({"user_id": PARENT_USER_ID}, {"$set": {
        "parent_daily_count": 30,
        "parent_daily_count_date": today,
        "parent_boosters_remaining": 0,
    }})
    r = requests.post(f"{API}/family/chat",
        headers={"Authorization": f"Bearer {PARENT_TOKEN}"},
        json={"messages": [{"role": "user", "content": "TEST should 429"}]},
        timeout=30,
    )
    assert r.status_code == 429
    assert "daily_cap" in r.text.lower()
    mongo.users.update_one({"user_id": PARENT_USER_ID}, {"$set": {
        "parent_daily_count": 0, "parent_daily_count_date": None,
        "parent_boosters_remaining": 0,
    }})


# -------- Extended sponsor inquiry (Lead Partner) --------
def test_sponsor_inquiry_lead_partner_fields(mongo):
    r = requests.post(f"{API}/sponsor/inquire", json={
        "name": "TEST Lead",
        "email": "TEST_lead@example.com",
        "company": "Big Co",
        "budget_tier": "lead_partner",
        "partnership_pillars": ["talent_pipeline", "custom_cohort"],
        "desired_range": "100k_250k",
        "hero_outcome": "A measurable pipeline of 20+ builders trained in 12 months.",
        "message": "TEST inquiry — interested in Lead Partner tier for Phase 1C.",
    }, timeout=20)
    assert r.status_code == 200, r.text
    # The endpoint returns {"ok": True} without id; look up by email+budget_tier
    doc = mongo.sponsor_inquiries.find_one(
        {"email": "TEST_lead@example.com", "budget_tier": "lead_partner"},
        sort=[("created_at", -1)],
    )
    assert doc is not None
    assert doc["budget_tier"] == "lead_partner"
    assert doc["partnership_pillars"] == ["talent_pipeline", "custom_cohort"]
    assert doc["desired_range"] == "100k_250k"
    assert "20+" in doc["hero_outcome"]
    mongo.sponsor_inquiries.delete_many({"email": "TEST_lead@example.com"})


# -------- Admin endpoints --------
def test_admin_stripe_transactions_requires_token():
    r = requests.get(f"{API}/admin/stripe/transactions", timeout=20)
    assert r.status_code in (401, 403)


def test_admin_stripe_transactions_ok():
    r = requests.get(f"{API}/admin/stripe/transactions",
        headers={"X-Admin-Token": ADMIN_TOKEN}, timeout=20)
    assert r.status_code == 200
    data = r.json()
    assert "transactions" in data
    assert "total" in data
    assert "total_paid_usd" in data
    assert isinstance(data["transactions"], list)


# -------- my-purchases --------
def test_my_purchases_requires_auth():
    r = requests.get(f"{API}/stripe/my-purchases", timeout=20)
    assert r.status_code == 401


def test_my_purchases_ok():
    r = requests.get(f"{API}/stripe/my-purchases",
        headers={"Authorization": f"Bearer {PARENT_TOKEN}"}, timeout=20)
    assert r.status_code == 200
    data = r.json()
    assert "parent_boosters_remaining" in data
    assert "max_boosters_remaining" in data
    assert "miles_boosters_remaining" in data
    assert "family_founding_locked_until" in data
    assert "miles_founding_locked_until" in data


# -------- regression: prior endpoints still work --------
def test_regression_products_and_auth_me():
    r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {PARENT_TOKEN}"}, timeout=20)
    assert r.status_code == 200
    assert r.json()["user_id"] == PARENT_USER_ID


# -------- final cleanup of parent test user state --------
def test_zz_cleanup_parent_user(mongo):
    mongo.users.update_one({"user_id": PARENT_USER_ID}, {"$set": {
        "parent_boosters_remaining": 0,
        "max_boosters_remaining": 0,
        "miles_boosters_remaining": 0,
        "family_founding_locked_until": None,
        "miles_founding_locked_until": None,
        "parent_daily_count": 0,
        "parent_daily_count_date": None,
        "daily_count": 0,
        "daily_count_date": None,
        "miles_daily_count": 0,
        "miles_daily_count_date": None,
    }})
    mongo.payment_transactions.delete_many({"user_id": PARENT_USER_ID})
    mongo.family_founding_signups.delete_many({"user_id": PARENT_USER_ID})
    mongo.miles_founding_signups.delete_many({"user_id": PARENT_USER_ID})
    u = mongo.users.find_one({"user_id": PARENT_USER_ID})
    assert u["parent_boosters_remaining"] == 0
