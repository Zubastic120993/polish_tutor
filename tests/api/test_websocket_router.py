import asyncio

import pytest
from contextlib import contextmanager

from fastapi import FastAPI, WebSocket
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from src.api.routers.websocket import websocket_chat, manager
from src.core.app_context import app_context


class StubTutor:
    def __init__(self):
        self.response = {
            "status": "success",
            "data": {"reply_text": "Odpowiedź"},
            "metadata": {"attempt_id": 1},
        }
        self.calls = []

    def respond(self, **kwargs):
        self.calls.append(kwargs)
        return self.response


@pytest.fixture
def ws_client(monkeypatch):
    app = FastAPI()

    async def no_sleep(_):
        return None

    monkeypatch.setattr("src.api.routers.websocket.asyncio.sleep", no_sleep)

    stub_tutor = StubTutor()
    original_tutor = getattr(app_context, "_tutor", None)
    app_context._tutor = stub_tutor

    @app.websocket("/ws/chat")
    async def ws_endpoint(websocket: WebSocket):
        await websocket_chat(websocket)

    client = TestClient(app, raise_server_exceptions=False)
    manager.active_connections.clear()

    try:
        yield client, stub_tutor
    finally:
        manager.active_connections.clear()
        app_context._tutor = original_tutor


@contextmanager
def _connected_socket(ws_client):
    client, _ = ws_client
    with client.websocket_connect("/ws/chat") as websocket:
        websocket.send_json({"type": "connect", "user_id": 42})
        assert websocket.receive_json()["type"] == "connected"
        yield websocket
    manager.active_connections.pop(42, None)


def test_websocket_message_flow(ws_client):
    _, stub_tutor = ws_client
    with _connected_socket(ws_client) as websocket:
        websocket.send_json(
        {
            "type": "message",
            "text": "Cześć",
            "lesson_id": "L1",
            "dialogue_id": "D1",
            "speed": 1.0,
        }
    )

        typing_msg = websocket.receive_json()
        assert typing_msg["type"] == "typing"

        response_msg = websocket.receive_json()
        assert response_msg["type"] == "response"
        assert response_msg["data"]["reply_text"] == "Odpowiedź"
        assert stub_tutor.calls[0]["text"] == "Cześć"


def test_websocket_missing_fields(ws_client):
    with _connected_socket(ws_client) as websocket:
        websocket.send_json({"type": "message", "text": "", "lesson_id": "", "dialogue_id": ""})
        error_msg = websocket.receive_json()
        assert error_msg["type"] == "error"
        assert "Missing required fields" in error_msg["message"]


def test_websocket_unknown_message_type(ws_client):
    with _connected_socket(ws_client) as websocket:
        websocket.send_json({"type": "mystery"})
        error_msg = websocket.receive_json()
        assert error_msg["type"] == "error"
        assert "Unknown message type" in error_msg["message"]


def test_websocket_ping(ws_client):
    with _connected_socket(ws_client) as websocket:
        websocket.send_json({"type": "ping"})
        pong = websocket.receive_json()
        assert pong == {"type": "pong", "message": "pong"}


def test_websocket_invalid_json(ws_client):
    with _connected_socket(ws_client) as websocket:
        websocket.send_text("not-json")
        error_msg = websocket.receive_json()
        assert error_msg["type"] == "error"
        assert "Invalid JSON" in error_msg["message"]


def test_websocket_tutor_error_response(ws_client):
    _, stub_tutor = ws_client
    stub_tutor.response = {"status": "error", "message": "Boom"}
    with _connected_socket(ws_client) as websocket:
        websocket.send_json(
            {
                "type": "message",
                "text": "Hej",
                "lesson_id": "L1",
                "dialogue_id": "D1",
            }
        )
        websocket.receive_json()  # typing
        error_msg = websocket.receive_json()
        assert error_msg["type"] == "error"
        assert "Boom" in error_msg["message"]


def test_websocket_invalid_initial_message(ws_client):
    client, _ = ws_client
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/ws/chat") as websocket:
            websocket.send_json({"type": "hello"})
            websocket.receive_text()


def test_connection_manager_disconnect_on_close(ws_client):
    assert manager.active_connections == {}
    with _connected_socket(ws_client):
        pass

    assert manager.active_connections == {}
