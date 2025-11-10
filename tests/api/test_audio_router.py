import shutil

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.api.routers.audio import router
from src.core.app_context import app_context


class StubSetting:
    def __init__(self, value):
        self.value = value


class StubDatabase:
    def __init__(self, settings=None):
        # settings: dict[user_id] -> dict[key -> value]
        self.settings = settings or {}
        self.calls = []

    def get_user_setting(self, user_id: int, key: str):
        self.calls.append((user_id, key))
        user_settings = self.settings.get(user_id, {})
        value = user_settings.get(key)
        return StubSetting(value) if value is not None else None


class StubSpeechEngine:
    def __init__(self, path=None, source="generated_test_engine", available=None):
        self.path = path
        self.source = source
        self.calls = []
        self.available = available or {
            "mode": "online",
            "online": {"gpt4_tts": False, "elevenlabs": False, "gtts": False},
            "offline": {"coqui_tts": True, "pyttsx3": True},
        }

    def get_audio_path(self, **kwargs):
        self.calls.append(kwargs)
        return self.path, self.source

    def get_available_engines(self):
        return self.available


@pytest.fixture
def test_app(tmp_path, monkeypatch):
    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)

    stub_speech_engine = StubSpeechEngine(path=tmp_path / "audio.mp3")

    def _speech_engine_factory(*args, **kwargs):
        return stub_speech_engine

    monkeypatch.setattr(
        "src.services.speech_engine.SpeechEngine",
        _speech_engine_factory,
        raising=False,
    )

    monkeypatch.chdir(tmp_path)
    cache_dir = tmp_path / "audio_cache"

    original_database = getattr(app_context, "_database", None)
    stub_database = StubDatabase(
        settings={1: {"voice_mode": "offline"}, 2: {"voice_mode": "online"}}
    )
    app_context._database = stub_database

    try:
        yield client, stub_speech_engine, stub_database, cache_dir
    finally:
        app_context._database = original_database


def test_audio_generate_offline_mode(test_app):
    client, speech_engine, database, cache_dir = test_app
    speech_engine.path.parent.mkdir(parents=True, exist_ok=True)
    speech_engine.path.write_text("dummy audio")

    response = client.post(
        "/api/audio/generate",
        json={"text": "Cześć", "lesson_id": "L1", "phrase_id": "P1", "user_id": 1},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["data"]["cached"] is False
    assert body["data"]["engine"] == "test_engine"
    assert database.calls[0] == (1, "voice_mode")


def test_audio_generate_online_mode(test_app):
    client, speech_engine, database, cache_dir = test_app
    speech_engine.path.parent.mkdir(parents=True, exist_ok=True)
    speech_engine.path.write_text("dummy audio")

    response = client.post(
        "/api/audio/generate",
        json={"text": "Cześć", "lesson_id": "L1", "phrase_id": "P1", "user_id": 2},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["data"]["engine"] == "test_engine"
    assert database.calls[-1] == (2, "voice_mode")


def test_audio_generate_failure_returns_500(test_app):
    client, speech_engine, database, cache_dir = test_app
    speech_engine.path = None

    response = client.post(
        "/api/audio/generate",
        json={"text": "Cześć", "lesson_id": "L1", "phrase_id": "P1", "user_id": 1},
    )
    assert response.status_code == 500
    assert "failed to generate audio" in response.json()["detail"].lower()


def test_get_available_engines(test_app):
    client, speech_engine, database, cache_dir = test_app

    response = client.get("/api/audio/engines")
    assert response.status_code == 200
    assert response.json()["data"] == speech_engine.available


def test_audio_clear_cache_handles_missing_directory(test_app):
    client, speech_engine, database, cache_dir = test_app
    if cache_dir.exists():
        shutil.rmtree(cache_dir)

    response = client.post("/api/audio/clear-cache")
    assert response.status_code == 200
    assert response.json()["data"]["files_cleared"] == 0


def test_audio_clear_cache_removes_files(test_app):
    client, speech_engine, database, cache_dir = test_app
    cache_dir.mkdir(parents=True, exist_ok=True)
    audio_file = cache_dir / "file1.mp3"
    audio_file.write_text("audio")

    response = client.post("/api/audio/clear-cache")
    assert response.status_code == 200
    assert response.json()["data"]["files_cleared"] >= 1 or not audio_file.exists()
    assert not audio_file.exists()
