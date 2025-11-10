from fastapi import FastAPI
from fastapi.testclient import TestClient
import pytest

from src.api.routers.chat import router
from src.core.app_context import app_context


class StubTutor:
    def __init__(self, response=None, should_raise=False):
        self.response = response or {
            "status": "success",
            "message": "Hello",
            "data": {
                "reply_text": "Cześć",
                "score": 0.9,
                "feedback_type": "high",
                "audio": [],
            },
        }
        self.should_raise = should_raise
        self.calls = []

    def respond(self, **kwargs):
        self.calls.append(kwargs)
        if self.should_raise:
            raise RuntimeError("tutor failure")
        return self.response


@pytest.fixture
def client():
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


@pytest.fixture
def stub_tutor():
    original_tutor = getattr(app_context, "_tutor", None)
    tutor = StubTutor()
    app_context._tutor = tutor
    try:
        yield tutor
    finally:
        app_context._tutor = original_tutor


def test_chat_respond_success(client, stub_tutor):
    payload = {
        "user_id": 1,
        "text": "Cześć",
        "lesson_id": "L1",
        "dialogue_id": "D1",
    }
    response = client.post("/api/chat/respond", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert stub_tutor.calls[0]["user_id"] == 1


def test_chat_respond_handles_tutor_error(client, stub_tutor):
    stub_tutor.response = {"status": "error", "message": "Invalid input"}
    response = client.post(
        "/api/chat/respond",
        json={"user_id": 1, "text": "problem", "lesson_id": "L1", "dialogue_id": "D1"},
    )
    assert response.status_code == 400
    assert "invalid input" in response.json()["detail"].lower()


def test_chat_respond_handles_exception(client):
    original_tutor = getattr(app_context, "_tutor", None)
    failing_tutor = StubTutor(should_raise=True)
    app_context._tutor = failing_tutor
    try:
        response = client.post(
            "/api/chat/respond",
            json={"user_id": 2, "text": "Hej", "lesson_id": "L1", "dialogue_id": "D1"},
        )
        assert response.status_code == 500
        assert "internal server error" in response.json()["detail"].lower()
    finally:
        app_context._tutor = original_tutor
