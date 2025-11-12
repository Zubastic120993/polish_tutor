from pathlib import Path
from unittest.mock import patch, MagicMock

from src.services.speech_engine import SpeechEngine


def test_generate_cache_key_is_deterministic():
    engine = SpeechEngine(native_audio_dir="/tmp/nonexistent", cache_dir="/tmp/audio_cache", online_mode=False)
    first = engine.generate_cache_key("tekst", voice_id="default", speed=1.0, engine="pyttsx3")
    second = engine.generate_cache_key("tekst", voice_id="default", speed=1.0, engine="pyttsx3")
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
        online_mode=False,
    )

    audio_path, source = engine.get_audio_path(
        text="Tekst",
        lesson_id="lesson1",
        phrase_id="phrase_001",
        speed=0.75,
    )

    assert Path(audio_path) == slow_path
    assert source == "pre_recorded"


def test_get_audio_path_returns_cached_file(tmp_path, monkeypatch):
    native_dir = tmp_path / "native"
    cache_dir = tmp_path / "cache"
    engine = SpeechEngine(
        native_audio_dir=str(native_dir),
        cache_dir=str(cache_dir),
        online_mode=False,
    )

    cache_key = engine.generate_cache_key("Tekst", engine="gpt4")
    cached_file = cache_dir / f"{cache_key}.mp3"
    cached_file.write_bytes(b"cached")

    # Prevent fallback generation from running
    monkeypatch.setattr(engine, "_generate_audio", lambda *args, **kwargs: (None, "none"))

    audio_path, source = engine.get_audio_path(text="Tekst", speed=1.0)
    assert Path(audio_path) == cached_file
    assert source == "cached_gpt4"


def test_get_available_engines():
    """Test get_available_engines returns correct engine availability."""
    engine = SpeechEngine(native_audio_dir="/tmp", cache_dir="/tmp/cache", online_mode=False)
    available = engine.get_available_engines()

    assert "mode" in available
    assert "online" in available
    assert "offline" in available
    assert available["mode"] == "offline"


def test_get_available_engines_online_mode():
    """Test get_available_engines in online mode."""
    engine = SpeechEngine(native_audio_dir="/tmp", cache_dir="/tmp/cache", online_mode=True)
    available = engine.get_available_engines()

    assert available["mode"] == "online"


def test_generate_with_pyttsx3_success(tmp_path):
    """Test pyttsx3 audio generation."""
    engine = SpeechEngine(native_audio_dir="/tmp", cache_dir=str(tmp_path), online_mode=False)

    # Mock the pyttsx3 module and its init function
    with patch('src.services.speech_engine.pyttsx3') as mock_pyttsx3:
        mock_engine = MagicMock()
        mock_pyttsx3.init.return_value = mock_engine

        # Initialize the engine
        engine._pyttsx3_engine = mock_engine

        # Mock the file operations to avoid actual file creation
        with patch('builtins.open', create=True) as mock_open:
            mock_file = MagicMock()
            mock_open.return_value.__enter__.return_value = mock_file

            result = engine._generate_with_pyttsx3("Test text", 1.0, "default")

            # Just check that the method was called and didn't crash
            mock_engine.save_to_file.assert_called_once()
            mock_engine.runAndWait.assert_called_once()


def test_generate_with_pyttsx3_failure(tmp_path):
    """Test pyttsx3 audio generation failure."""
    engine = SpeechEngine(native_audio_dir="/tmp", cache_dir=str(tmp_path), online_mode=False)

    # Mock the pyttsx3 module and its init function
    with patch('src.services.speech_engine.pyttsx3') as mock_pyttsx3:
        mock_engine = MagicMock()
        mock_engine.save_to_file.side_effect = Exception("TTS error")
        mock_pyttsx3.init.return_value = mock_engine

        # Force re-initialization of the engine to use our mock
        engine._pyttsx3_engine = mock_engine

        result = engine._generate_with_pyttsx3("Test text", 1.0, "default")

        assert result is None


def test_adjust_speed_with_pydub(tmp_path):
    """Test audio speed adjustment."""
    engine = SpeechEngine(native_audio_dir="/tmp", cache_dir=str(tmp_path), online_mode=False)

    # Create a dummy input file
    input_path = tmp_path / "input.mp3"
    input_path.write_bytes(b"dummy audio data")

    output_path = tmp_path / "output.mp3"

    # Mock the entire pydub chain
    with patch('src.services.speech_engine.AudioSegment') as mock_audio_segment_class:
        mock_audio = MagicMock()
        mock_audio_segment_class.from_file.return_value = mock_audio
        mock_audio._spawn.return_value = mock_audio
        mock_audio.set_frame_rate.return_value = mock_audio

        engine._adjust_speed(input_path, output_path, 0.75)

        mock_audio._spawn.assert_called_once()
        mock_audio.set_frame_rate.assert_called_once()
        mock_audio.export.assert_called_once_with(str(output_path), format="mp3", bitrate="128k")


def test_cleanup_cache_method_exists(tmp_path):
    """Test that cleanup_cache method can be called."""
    cache_dir = tmp_path / "cache"
    cache_dir.mkdir()

    engine = SpeechEngine(native_audio_dir="/tmp", cache_dir=str(cache_dir), online_mode=False)

    # Just test that the method can be called without errors
    removed_count = engine.cleanup_cache(max_age_days=30)

    # Should return an integer (could be 0 if no old files)
    assert isinstance(removed_count, int)
    assert removed_count >= 0


def test_generate_audio_fallback_chain(tmp_path):
    """Test _generate_audio tries fallback engines in correct order."""
    engine = SpeechEngine(native_audio_dir="/tmp", cache_dir=str(tmp_path), online_mode=False)

    # Mock all generation methods to fail except the last one
    with patch.object(engine, '_generate_with_gpt4_tts', return_value=None), \
         patch.object(engine, '_generate_with_elevenlabs', return_value=None), \
         patch.object(engine, '_generate_with_coqui', return_value=None), \
         patch.object(engine, '_generate_with_gtts', return_value=None), \
         patch.object(engine, '_generate_with_pyttsx3', return_value=tmp_path / "test.mp3") as mock_pyttsx3:

        result = engine._generate_audio("Test text", 1.0, "default")

        assert result == (tmp_path / "test.mp3", "pyttsx3")
        mock_pyttsx3.assert_called_once()


def test_generate_audio_all_fail(tmp_path):
    """Test _generate_audio when all engines fail."""
    engine = SpeechEngine(native_audio_dir="/tmp", cache_dir=str(tmp_path), online_mode=False)

    # Mock all generation methods to fail
    with patch.object(engine, '_generate_with_gpt4_tts', return_value=None), \
         patch.object(engine, '_generate_with_elevenlabs', return_value=None), \
         patch.object(engine, '_generate_with_coqui', return_value=None), \
         patch.object(engine, '_generate_with_gtts', return_value=None), \
         patch.object(engine, '_generate_with_pyttsx3', return_value=None):

        result = engine._generate_audio("Test text", 1.0, "default")

        assert result == (None, "none")

