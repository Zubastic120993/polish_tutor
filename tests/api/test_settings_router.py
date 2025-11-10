from fastapi import FastAPI
from fastapi.testclient import TestClient
from types import SimpleNamespace
import pytest

from src.api.routers.settings import router
from src.core.app_context import app_context


class StubSetting:
    def __init__(self, key: str, value):
        self.key = key
        self.value = value


class StubDatabase:
    def __init__(self, settings_by_user=None, raise_on_get=False, raise_on_update=False):
        self.settings_by_user = settings_by_user or {}
        self.raise_on_get = raise_on_get
        self.raise_on_update = raise_on_update
        self.upserts = []

    def get_user_settings(self, user_id: int):
        if self.raise_on_get:
            raise RuntimeError("database error")
        return self.settings_by_user.get(user_id, [])

    def get_user_setting(self, user_id: int, key: str):
        if self.raise_on_get:
            raise RuntimeError("database error")
        items = self.settings_by_user.get(user_id, [])
        for setting in items:
            if setting.key == key:
                return setting
        return None

    def upsert_setting(self, user_id: int, key: str, value: str):
        if self.raise_on_update:
            raise RuntimeError("update failed")
        self.upserts.append((user_id, key, value))
        stored = StubSetting(key, value)
        self.settings_by_user.setdefault(user_id, []).append(stored)


@pytest.fixture
def test_app():
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


def test_settings_get_returns_defaults_when_empty(test_app, stub_database):
    response = test_app.get("/api/settings/get", params={"user_id": 1})
    assert response.status_code == 200
    payload = response.json()
    assert payload["data"]["voice_mode"] == "offline"
    assert payload["message"] == "Using default settings"


def test_settings_get_converts_legacy_audio_speed(test_app, stub_database):
    stub_database.settings_by_user = {
        2: [StubSetting("audio_speed", 0.75), StubSetting("voice_mode", "online")]
    }
    response = test_app.get("/api/settings/get", params={"user_id": 2})
    assert response.status_code == 200
    payload = response.json()
    assert payload["data"]["audio_speed"] == "slow"
    assert payload["data"]["voice_mode"] == "online"


def test_settings_get_handles_database_error(test_app):
    original_database = getattr(app_context, "_database", None)
    try:
        app_context._database = StubDatabase(raise_on_get=True)
        response = test_app.get("/api/settings/get", params={"user_id": 3})
        assert response.status_code == 500
        assert "internal server error" in response.json()["detail"].lower()
    finally:
        app_context._database = original_database


def test_settings_update_upserts_values(test_app, stub_database):
    payload = {
        "user_id": 4,
        "voice_mode": "online",
        "audio_speed": "fast",
        "translation": "smart",
        "mic_mode": "tap",
        "tutor_mode": "coach",
        "voice": "female",
        "audio_output": "headphones",
        "theme": "dark",
        "language": "pl",
        "confidence_slider": 5,
        "profile_template": "adult",
    }
    response = test_app.post("/api/settings/update", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["data"]["voice_mode"] == "online"
    assert (4, "voice_mode", "online") in stub_database.upserts
    assert (4, "confidence_slider", "5") in stub_database.upserts


def test_settings_update_reads_existing_when_value_missing(test_app, stub_database):
    stub_database.settings_by_user = {
        5: [StubSetting("translation", "smart"), StubSetting("confidence_slider", "2")]
    }
    payload = {
        "user_id": 5,
        "voice_mode": None,
        "audio_speed": None,
        "translation": None,
        "mic_mode": None,
        "tutor_mode": None,
        "voice": None,
        "audio_output": None,
        "theme": None,
        "language": None,
        "confidence_slider": None,
        "profile_template": None,
    }
    response = test_app.post("/api/settings/update", json=payload)
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["translation"] == "smart"
    assert data["confidence_slider"] == 2


def test_settings_update_handles_database_failure(test_app):
    original_database = getattr(app_context, "_database", None)
    failing_db = StubDatabase(raise_on_update=True)
    app_context._database = failing_db
    try:
        response = test_app.post(
            "/api/settings/update",
            json={
                "user_id": 6,
                "voice_mode": "online",
                "audio_speed": "normal",
                "translation": "smart",
                "mic_mode": "tap",
                "tutor_mode": "coach",
                "voice": "neutral",
                "audio_output": "speakers",
                "theme": "light",
                "language": "en",
                "confidence_slider": 3,
                "profile_template": None,
            },
        )
        assert response.status_code == 500
        assert "internal server error" in response.json()["detail"].lower()
    finally:
        app_context._database = original_database
