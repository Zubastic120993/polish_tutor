from datetime import datetime

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.api.routers.backup import router
from src.core.app_context import app_context


class StubAttempt:
    def __init__(self, id, phrase_id, score=0.8, created_at=None):
        self.id = id
        self.phrase_id = phrase_id
        self.user_input = "cześć"
        self.score = score
        self.feedback_type = "high"
        self.created_at = created_at


class StubLessonProgress:
    def __init__(self, lesson_id, completed=False, last_accessed=None):
        self.lesson_id = lesson_id
        self.current_dialogue_id = "turn_1"
        self.completed = completed
        self.last_accessed = last_accessed


class StubSRSMemory:
    def __init__(self, phrase_id, next_review=None, last_review=None):
        self.phrase_id = phrase_id
        self.efactor = 2.5
        self.interval_days = 3
        self.review_count = 4
        self.next_review = next_review
        self.last_review = last_review


class StubSetting:
    def __init__(self, key, value):
        self.key = key
        self.value = value


class StubDatabase:
    def __init__(self, raise_on_fetch=False):
        self.raise_on_fetch = raise_on_fetch
        now = datetime(2025, 1, 1)
        self.attempts = [StubAttempt(1, "L1_turn1", created_at=now)]
        self.lesson_progresses = [
            StubLessonProgress("L1", completed=True, last_accessed=now)
        ]
        self.srs_memories = [
            StubSRSMemory("L1_turn1", next_review=now, last_review=now)
        ]
        self.settings = [StubSetting("voice_mode", "online")]

    def _maybe_raise(self):
        if self.raise_on_fetch:
            raise RuntimeError("database failure")

    def get_user_attempts(self, user_id):
        self._maybe_raise()
        return list(self.attempts)

    def get_user_progresses(self, user_id):
        self._maybe_raise()
        return list(self.lesson_progresses)

    def get_user_srs_memories(self, user_id):
        self._maybe_raise()
        return list(self.srs_memories)

    def get_user_settings(self, user_id):
        self._maybe_raise()
        return list(self.settings)


@pytest.fixture
def client():
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


@pytest.fixture
def stub_database():
    original_database = getattr(app_context, "_database", None)
    db = StubDatabase()
    app_context._database = db
    try:
        yield db
    finally:
        app_context._database = original_database


def test_backup_export_returns_json(client, stub_database):
    response = client.get("/api/backup/export", params={"user_id": 9, "format": "json"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "success"
    data = payload["data"]
    assert data["user_id"] == 9
    assert len(data["attempts"]) == 1
    assert data["settings"]["voice_mode"] == "online"


def test_backup_export_csv_returns_placeholder(client, stub_database):
    response = client.get("/api/backup/export", params={"user_id": 9, "format": "csv"})
    assert response.status_code == 200
    payload = response.json()
    assert "not yet implemented" in payload["message"].lower()
    assert payload["data"]["user_id"] == 9


def test_backup_export_handles_error(client, stub_database):
    stub_database.raise_on_fetch = True
    response = client.get("/api/backup/export", params={"user_id": 10})
    assert response.status_code == 500
    assert "internal server error" in response.json()["detail"].lower()
