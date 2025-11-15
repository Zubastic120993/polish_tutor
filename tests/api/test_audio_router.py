import shutil
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.api.routers.audio import router


@pytest.fixture
def client(tmp_path, monkeypatch):
    app = FastAPI()
    app.include_router(router)
    monkeypatch.chdir(tmp_path)
    return TestClient(app)


@pytest.fixture
def tts_stub(monkeypatch):
    state = {"calls": [], "should_fail": False, "audio": b"audio"}

    async def _fake_generate(api_key, text, speed):
        state["calls"].append({"api_key": api_key, "text": text, "speed": speed})
        if state["should_fail"]:
            raise RuntimeError("boom")
        return state["audio"]

    monkeypatch.setattr("src.api.routers.audio._generate_polish_tts", _fake_generate)
    return state


def test_audio_generate_returns_audio_url(client, monkeypatch, tts_stub):
    monkeypatch.setenv("MURF_API_KEY", "test-key")
    response = client.post(
        "/api/audio/generate",
        json={"text": "Cześć", "speed": 1.2, "user_id": "1"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"
    audio_url = body["data"]["audio_url"]
    assert audio_url.startswith("/audio_cache/")
    saved_path = Path(audio_url.lstrip("/"))
    assert saved_path.exists()
    assert tts_stub["calls"][0]["text"] == "Cześć"
    assert tts_stub["calls"][0]["speed"] == 1.2


def test_audio_generate_failure_returns_500(client, monkeypatch, tts_stub):
    monkeypatch.setenv("MURF_API_KEY", "test-key")
    tts_stub["should_fail"] = True

    response = client.post("/api/audio/generate", json={"text": "Hej"})
    assert response.status_code == 500
    assert "tts generation failed" in response.json()["detail"].lower()


def test_audio_generate_missing_api_key_returns_500(client, monkeypatch):
    monkeypatch.delenv("MURF_API_KEY", raising=False)
    response = client.post("/api/audio/generate", json={"text": "Hej"})
    assert response.status_code == 500
    assert "murf_api_key" in response.json()["detail"].lower()


def test_audio_generate_placeholder_api_key_is_rejected(client, monkeypatch):
    monkeypatch.setenv("MURF_API_KEY", "your_real_api_key_here")
    response = client.post("/api/audio/generate", json={"text": "Hej"})
    assert response.status_code == 500
    assert "murf_api_key" in response.json()["detail"].lower()


def test_get_available_engines(client, monkeypatch):
    monkeypatch.setenv("MURF_API_KEY", "abc")
    response = client.get("/api/audio/engines")
    assert response.status_code == 200
    payload = response.json()
    assert payload["data"]["online"]["murf"] is True


def test_audio_clear_cache_handles_missing_directory(client):
    cache_dir = Path("audio_cache")
    if cache_dir.exists():
        shutil.rmtree(cache_dir)

    response = client.post("/api/audio/clear-cache")
    assert response.status_code == 200
    assert response.json()["data"]["files_cleared"] == 0


def test_audio_clear_cache_removes_files(client):
    cache_dir = Path("audio_cache")
    cache_dir.mkdir(parents=True, exist_ok=True)
    audio_file = cache_dir / "file1.mp3"
    audio_file.write_text("audio")

    response = client.post("/api/audio/clear-cache")
    assert response.status_code == 200
    assert not audio_file.exists()
