from datetime import datetime, timedelta
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.api.routers.review import router
from src.core.app_context import app_context


class StubDueItem:
    def __init__(self, phrase_id, user_id, next_review=None):
        self.phrase_id = phrase_id
        self.user_id = user_id
        self.next_review = next_review
        self.efactor = 2.3
        self.interval_days = 3
        self.review_count = 5
        self.strength_level = 0.8


class StubPhrase:
    def __init__(self, lesson_id, text):
        self.lesson_id = lesson_id
        self.text = text


class StubDatabase:
    def __init__(self, due_items=None, phrases=None, raise_on_due=False):
        self.due_items = due_items or []
        self.phrases = phrases or {}
        self.raise_on_due = raise_on_due
        self.calls = []

    def get_due_srs_items(self, user_id):
        if self.raise_on_due:
            raise RuntimeError("database failure")
        self.calls.append(("get_due_srs_items", user_id))
        return list(self.due_items)

    def get_phrase(self, phrase_id):
        self.calls.append(("get_phrase", phrase_id))
        return self.phrases.get(phrase_id)


class StubLessonManager:
    def __init__(self, lessons=None):
        self.lessons = lessons or {}

    def get_lesson(self, lesson_id):
        return self.lessons.get(lesson_id)


class StubSRSMemory:
    def __init__(self, next_review=None, interval_days=4, efactor=2.5):
        self.next_review = next_review
        self.interval_days = interval_days
        self.efactor = efactor


class StubSRSManager:
    def __init__(self, memory):
        self.memory = memory
        self.calls = []

    def create_or_update_srs_memory(self, **kwargs):
        self.calls.append(kwargs)
        return self.memory


@pytest.fixture
def client():
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


@pytest.fixture
def stub_context():
    original_database = getattr(app_context, "_database", None)
    original_tutor = getattr(app_context, "_tutor", None)

    due_item = StubDueItem("L1_turn1", user_id=7, next_review=datetime(2025, 1, 1))
    phrase = StubPhrase("L1", "Cześć")
    lesson_manager = StubLessonManager(
        {
            "L1": {
                "dialogues": [
                    {
                        "id": "L1_turn1",
                        "tutor": "Dzień dobry",
                        "translation": "Good morning",
                        "audio": "audio1.mp3",
                    }
                ]
            }
        }
    )
    database = StubDatabase(due_items=[due_item], phrases={"L1_turn1": phrase})
    srs_memory = StubSRSMemory(
        next_review=datetime(2025, 1, 5), interval_days=5, efactor=2.9
    )
    srs_manager = StubSRSManager(memory=srs_memory)

    tutor = SimpleNamespace(lesson_manager=lesson_manager, srs_manager=srs_manager)
    app_context._database = database
    app_context._tutor = tutor

    try:
        yield {
            "database": database,
            "lesson_manager": lesson_manager,
            "srs_manager": srs_manager,
        }
    finally:
        app_context._database = original_database
        app_context._tutor = original_tutor


def test_review_get_returns_due_items(client, stub_context):
    response = client.get("/api/review/get", params={"user_id": 7})
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"
    assert body["data"][0]["phrase_text"] == "Dzień dobry"
    assert body["data"][0]["translation"] == "Good morning"
    assert ("get_due_srs_items", 7) in stub_context["database"].calls


def test_review_get_handles_error(client, stub_context):
    stub_context["database"].raise_on_due = True
    response = client.get("/api/review/get", params={"user_id": 7})
    assert response.status_code == 500
    assert "internal server error" in response.json()["detail"].lower()


def test_review_update_returns_next_review(client, stub_context):
    response = client.post(
        "/api/review/update",
        json={
            "user_id": 7,
            "phrase_id": "L1_turn1",
            "quality": 4,
            "confidence": 3,
        },
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["interval_days"] == 5
    assert "2025-01-05" in data["next_review"]
    assert stub_context["srs_manager"].calls[0]["quality"] == 4


def test_review_update_computes_next_review_when_missing(client, stub_context):
    stub_context["srs_manager"].memory.next_review = None
    stub_context["srs_manager"].memory.interval_days = 2
    response = client.post(
        "/api/review/update",
        json={
            "user_id": 8,
            "phrase_id": "L1_turn2",
            "quality": 3,
            "confidence": None,
        },
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["interval_days"] == 2
    assert "next_review" in data
