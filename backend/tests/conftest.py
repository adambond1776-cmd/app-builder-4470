import os
import time
import uuid
from datetime import datetime, timezone, timedelta

import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://app-builder-4470.preview.emergentagent.com").rstrip("/")
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "max_coach")


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def mongo():
    c = MongoClient(MONGO_URL)
    yield c[DB_NAME]
    # cleanup TEST_ data after session
    c[DB_NAME].users.delete_many({"email": {"$regex": "^TEST_"}})
    c[DB_NAME].user_sessions.delete_many({"session_token": {"$regex": "^TEST_sess_"}})
    c[DB_NAME].chat_logs.delete_many({"user_id": {"$regex": "^TEST_user_"}})
    c[DB_NAME].founding_20_applications.delete_many({"user_id": {"$regex": "^TEST_user_"}})
    c[DB_NAME].feedback.delete_many({"user_id": {"$regex": "^TEST_user_"}})
    c.close()


def _seed_user(mongo, *, age_confirmed=True, beta_consent=True, daily_count=0, daily_count_date=None, memory_card=None, exchange_count=0, founding_20_applied=False, role="kid", parent_daily_count=0, parent_daily_count_date=None, parent_memory_card=None, parent_exchange_count=0, miles_persona=None, miles_daily_count=0, miles_daily_count_date=None, miles_memory_card=None, miles_exchange_count=0, miles_documentary_interest=None, miles_onboarded_at=None):
    suffix = f"{int(time.time()*1000)}_{uuid.uuid4().hex[:6]}"
    user_id = f"TEST_user_{suffix}"
    token = f"TEST_sess_{suffix}"
    mongo.users.insert_one({
        "user_id": user_id,
        "email": f"TEST_{suffix}@example.com",
        "name": "Test Founder",
        "picture": None,
        "role": role,
        "age_confirmed": age_confirmed,
        "beta_consent": beta_consent,
        "documentary_interest": "maybe",
        "current_track": "School Track" if role == "kid" else None,
        "memory_card": memory_card,
        "exchange_count_since_summary": exchange_count,
        "daily_count": daily_count,
        "daily_count_date": daily_count_date,
        "parent_memory_card": parent_memory_card,
        "parent_exchange_count_since_summary": parent_exchange_count,
        "parent_daily_count": parent_daily_count,
        "parent_daily_count_date": parent_daily_count_date,
        "miles_persona": miles_persona,
        "miles_memory_card": miles_memory_card,
        "miles_exchange_count_since_summary": miles_exchange_count,
        "miles_daily_count": miles_daily_count,
        "miles_daily_count_date": miles_daily_count_date,
        "miles_documentary_interest": miles_documentary_interest,
        "miles_onboarded_at": miles_onboarded_at,
        "founding_20_applied": founding_20_applied,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    mongo.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc),
    })
    return user_id, token


@pytest.fixture
def seed_user(mongo):
    created = []

    def factory(**kwargs):
        uid, tok = _seed_user(mongo, **kwargs)
        created.append(uid)
        return uid, tok

    yield factory

    for uid in created:
        mongo.users.delete_many({"user_id": uid})
        mongo.user_sessions.delete_many({"user_id": uid})
        mongo.chat_logs.delete_many({"user_id": uid})
        mongo.parent_chat_logs.delete_many({"user_id": uid})
        mongo.miles_chat_logs.delete_many({"user_id": uid})
        mongo.miles_ideas.delete_many({"user_id": uid})
        mongo.miles_poll_votes.delete_many({"user_id": uid})
        mongo.miles_founding_signups.delete_many({"user_id": uid})
        mongo.founding_20_applications.delete_many({"user_id": uid})
        mongo.feedback.delete_many({"user_id": uid})


@pytest.fixture
def auth_headers():
    def factory(token):
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    return factory


@pytest.fixture
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s
