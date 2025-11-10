from datetime import datetime, timedelta

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.api.routers.user import router
from src.core.app_context import app_context


class StubAttempt:
    def __init__(self, score, created_at=None):
        self.score = score
        self.created_at = created_at


class StubLessonProgress:
    def __init__(self, status):
        self.status = status


class StubDatabase:
    def __init__(self, attempts=None, progresses=None, raise_on_attempts=False):
        self.attempts = attempts or []
        self.progresses = progresses or []
        self.raise_on_attempts = raise_on_attempts
        self.calls = []

    def get_user_attempts(self, user_id):
        if self.raise_on_attempts:
            raise RuntimeError("database error")
        self.calls.append(("get_user_attempts", user_id))
        return list(self.attempts)

    def get_user_progresses(self, user_id):
        self.calls.append(("get_user_progresses", user_id))
        return list(self.progresses)


@pytest.fixture
def client():
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


@pytest.fixture
def stub_database():
    original_database = getattr(app_context, "_database", None)
    stub = StubDatabase()
    app_context._database = stub
    try:
        yield stub
    finally:
        app_context._database = original_database


def test_user_stats_returns_defaults_when_no_attempts(client, stub_database):
    response = client.get("/api/user/stats", params={"user_id": 5})
    assert response.status_code == 200
    body = response.json()
    assert body["data"]["total_attempts"] == 0
    assert body["message"] == "No statistics available"


def test_user_stats_calculates_metrics(client, stub_database):
    now = datetime.utcnow()
    stub_database.attempts = [
        StubAttempt(0.8, now - timedelta(days=1)),
        StubAttempt(0.6, now - timedelta(days=2)),
        StubAttempt(0.9, now - timedelta(hours=1)),
    ]
    stub_database.progresses = [
        StubLessonProgress("completed"),
        StubLessonProgress("in_progress"),
        StubLessonProgress("completed"),
    ]

    response = client.get("/api/user/stats", params={"user_id": 5})
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["total_attempts"] == 3
    assert data["average_accuracy"] == round((0.8 + 0.6 + 0.9) / 3 * 100, 2)
    assert data["study_time_minutes"] == round(3 / 5, 1)
    assert data["progress_percent"] == round(2 / 3 * 100, 2)
    assert len(data["accuracy_trend"]) == 3


def test_user_stats_handles_error(client, stub_database):
    stub_database.raise_on_attempts = True
    response = client.get("/api/user/stats", params={"user_id": 6})
    assert response.status_code == 500
    assert "internal server error" in response.json()["detail"].lower()
