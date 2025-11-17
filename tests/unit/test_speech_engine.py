import os
import time
from pathlib import Path

from src.services.speech_engine import SpeechEngine


def test_generate_cache_key_is_deterministic():
    engine = SpeechEngine(
        native_audio_dir="/tmp/nonexistent",
        cache_dir="/tmp/audio_cache",
        murf_api_key="test-key",
    )
    first = engine.generate_cache_key("tekst", "default", 1.0)
    second = engine.generate_cache_key("tekst", "default", 1.0)
    assert first == second


def test_get_audio_path_prefers_pre_recorded(tmp_path):
    native_dir = tmp_path / "native"
    lesson_dir = native_dir / "lesson1"
    lesson_dir.mkdir(parents=True, exist_ok=True)

    slow_path = lesson_dir / "phrase_001_slow.mp3"
    slow_path.write_bytes(b"slow")
    (lesson_dir / "phrase_001.mp3").write_bytes(b"normal")

    engine = SpeechEngine(
        native_audio_dir=str(native_dir),
        cache_dir=str(tmp_path / "cache"),
        murf_api_key="test-key",
    )

    audio_path, source = engine.get_audio_path(
        text="Tekst", lesson_id="lesson1", phrase_id="phrase_001", speed=0.8
    )

    assert Path(audio_path) == slow_path
    assert source == "pre_recorded"


def test_get_audio_path_returns_cached_file(tmp_path):
    engine = SpeechEngine(
        native_audio_dir=str(tmp_path / "native"),
        cache_dir=str(tmp_path / "cache"),
        murf_api_key="test-key",
    )

    cache_key = engine.generate_cache_key("Tekst", engine.default_voice_id, 1.0)
    cached_file = engine._cache_file_path(cache_key)
    cached_file.parent.mkdir(parents=True, exist_ok=True)
    cached_file.write_bytes(b"cached")

    audio_path, source = engine.get_audio_path(text="Tekst", speed=1.0)
    assert Path(audio_path) == cached_file
    assert source == "cached_murf"


def test_get_audio_path_generates_when_cache_miss(tmp_path, monkeypatch):
    engine = SpeechEngine(
        native_audio_dir=str(tmp_path / "native"),
        cache_dir=str(tmp_path / "cache"),
        murf_api_key="test-key",
    )

    def _fake_synthesize(text, voice_id, speed, output_path):
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_bytes(b"generated")
        return output_path

    monkeypatch.setattr(engine, "_synthesize_with_murf", _fake_synthesize)

    path, source = engine.get_audio_path(text="Tekst", speed=1.0)
    assert source == "generated_murf"
    assert Path(path).exists()


def test_get_available_engines_reports_api_key(monkeypatch):
    monkeypatch.delenv("MURF_API_KEY", raising=False)
    engine = SpeechEngine(murf_api_key=None)
    info = engine.get_available_engines()
    assert info["online"]["murf"] is False

    engine_with_key = SpeechEngine(murf_api_key="abc123")
    info_with_key = engine_with_key.get_available_engines()
    assert info_with_key["online"]["murf"] is True


def test_cleanup_cache_removes_old_files(tmp_path):
    cache_dir = tmp_path / "cache"
    engine = SpeechEngine(cache_dir=str(cache_dir), murf_api_key="test")

    old_file = engine._cache_file_path("deadbeefdeadbeefdeadbeefdeadbeef")
    old_file.parent.mkdir(parents=True, exist_ok=True)
    old_file.write_bytes(b"old")

    old_mtime = time.time() - (60 * 60 * 24 * 40)
    os.utime(old_file, (old_mtime, old_mtime))

    removed = engine.cleanup_cache(max_age_days=30)
    assert removed >= 1
    assert not old_file.exists()
