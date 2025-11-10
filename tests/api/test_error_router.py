from fastapi import FastAPI
from fastapi.testclient import TestClient
import pytest

from src.api.routers.error import router


@pytest.fixture
def client():
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


def test_error_report_logs_success(client, monkeypatch):
    logs = []

    def fake_error(message):
        logs.append(("error", message))

    def fake_debug(message):
        logs.append(("debug", message))

    monkeypatch.setattr("src.api.routers.error.logger.error", fake_error)
    monkeypatch.setattr("src.api.routers.error.logger.debug", fake_debug)

    response = client.post(
        "/api/error/report",
        json={
            "user_id": 3,
            "error_type": "client",
            "message": "Something went wrong",
            "stack_trace": "Traceback...",
            "context": {"route": "/example"},
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "success"
    assert any(entry[0] == "error" for entry in logs)


def test_error_report_handles_exception(client, monkeypatch):
    state = {"raised": False}

    def boom(*args, **kwargs):
        if not state["raised"]:
            state["raised"] = True
            raise RuntimeError("logger failure")
        # allow subsequent calls to succeed

    monkeypatch.setattr("src.api.routers.error.logger.error", boom)
    monkeypatch.setattr("src.api.routers.error.logger.debug", lambda *_, **__: None)

    response = client.post(
        "/api/error/report",
        json={
            "error_type": "test",
            "message": "fail",
        },
    )

    assert response.status_code == 500
    assert "internal server error" in response.json()["detail"].lower()
