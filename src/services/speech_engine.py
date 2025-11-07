"""Speech Engine for text-to-speech with fallback chain."""
import hashlib
import logging
import os
from pathlib import Path
from typing import Optional, Tuple

try:
    import pyttsx3
except ImportError:
    pyttsx3 = None

try:
    from gtts import gTTS
except ImportError:
    gTTS = None

try:
    from pydub import AudioSegment
except ImportError:
    AudioSegment = None

logger = logging.getLogger(__name__)


class SpeechEngine:
    """Engine for text-to-speech with priority-based fallback chain."""

    def __init__(
        self,
        native_audio_dir: Optional[str] = None,
        cache_dir: Optional[str] = None,
        language: str = "pl",
        online_mode: bool = False,
    ):
        """Initialize SpeechEngine.

        Args:
            native_audio_dir: Directory for pre-recorded audio files (default: ./static/audio/native)
            cache_dir: Directory for cached generated audio (default: ./audio_cache)
            language: Language code for TTS (default: "pl" for Polish)
            online_mode: Whether to use online TTS services (default: False)
        """
        self.native_audio_dir = Path(native_audio_dir or "./static/audio/native")
        self.cache_dir = Path(cache_dir or "./audio_cache")
        self.language = language
        self.online_mode = online_mode

        # Create cache directory if it doesn't exist
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        # Initialize pyttsx3 engine if available
        self._pyttsx3_engine = None
        if pyttsx3:
            try:
                self._pyttsx3_engine = pyttsx3.init()
                # Set language if supported
                try:
                    voices = self._pyttsx3_engine.getProperty("voices")
                    # Try to find Polish voice
                    for voice in voices:
                        if "polish" in voice.name.lower() or "pl" in voice.id.lower():
                            self._pyttsx3_engine.setProperty("voice", voice.id)
                            break
                except Exception:
                    pass
            except Exception as e:
                logger.warning(f"Failed to initialize pyttsx3: {e}")
                self._pyttsx3_engine = None

    def generate_cache_key(self, text: str, voice_id: str = "default", speed: float = 1.0) -> str:
        """Generate MD5 cache key for audio.

        Args:
            text: Text to synthesize
            voice_id: Voice identifier
            speed: Playback speed (0.75 or 1.0)

        Returns:
            MD5 hash string
        """
        key_string = f"{text}:{voice_id}:{speed}"
        return hashlib.md5(key_string.encode("utf-8")).hexdigest()

    def get_audio_path(
        self,
        text: str,
        lesson_id: Optional[str] = None,
        phrase_id: Optional[str] = None,
        audio_filename: Optional[str] = None,
        speed: float = 1.0,
        voice_id: str = "default",
    ) -> Tuple[Optional[Path], str]:
        """Get audio file path using priority order.

        Priority:
        1. Pre-recorded MP3 from native_audio_dir
        2. Cached generated audio
        3. pyttsx3 offline generation (cached)
        4. Cloud TTS (gTTS) if online_mode enabled (cached)

        Args:
            text: Text to synthesize
            lesson_id: Lesson identifier (for pre-recorded audio lookup)
            phrase_id: Phrase identifier (for pre-recorded audio lookup)
            audio_filename: Explicit audio filename (from lesson JSON)
            speed: Playback speed (0.75 or 1.0)
            voice_id: Voice identifier

        Returns:
            Tuple of (audio_path, source) where source indicates where audio came from
        """
        # Priority 1: Pre-recorded audio
        if lesson_id and (phrase_id or audio_filename):
            pre_recorded_path = self._check_pre_recorded(
                lesson_id, phrase_id, audio_filename, speed
            )
            if pre_recorded_path:
                return (pre_recorded_path, "pre_recorded")

        # Priority 2: Cached generated audio
        cache_key = self.generate_cache_key(text, voice_id, speed)
        cached_path = self.cache_dir / f"{cache_key}.mp3"
        if cached_path.exists():
            logger.debug(f"Found cached audio: {cached_path}")
            return (cached_path, "cached")

        # Priority 3: Generate new audio
        generated_path = self._generate_audio(text, cache_key, speed, voice_id)
        if generated_path:
            return (generated_path, "generated")

        # No audio available
        return (None, "unavailable")

    def _check_pre_recorded(
        self,
        lesson_id: str,
        phrase_id: Optional[str],
        audio_filename: Optional[str],
        speed: float,
    ) -> Optional[Path]:
        """Check for pre-recorded audio file.

        Args:
            lesson_id: Lesson identifier
            phrase_id: Phrase identifier
            audio_filename: Explicit audio filename
            speed: Playback speed

        Returns:
            Path to audio file if found, None otherwise
        """
        lesson_audio_dir = self.native_audio_dir / lesson_id

        # Try explicit filename first (from lesson JSON)
        if audio_filename:
            audio_path = lesson_audio_dir / audio_filename
            if audio_path.exists():
                # If speed is 0.75, try slow version first
                if speed == 0.75:
                    slow_path = lesson_audio_dir / audio_filename.replace(
                        ".mp3", "_slow.mp3"
                    )
                    if slow_path.exists():
                        return slow_path
                return audio_path

        # Try phrase_id-based filename
        if phrase_id:
            base_filename = f"{phrase_id}.mp3"
            if speed == 0.75:
                slow_filename = f"{phrase_id}_slow.mp3"
                slow_path = lesson_audio_dir / slow_filename
                if slow_path.exists():
                    return slow_path
            audio_path = lesson_audio_dir / base_filename
            if audio_path.exists():
                return audio_path

        return None

    def _generate_audio(
        self, text: str, cache_key: str, speed: float, voice_id: str
    ) -> Optional[Path]:
        """Generate audio using available TTS engine.

        Args:
            text: Text to synthesize
            cache_key: Cache key for storing generated audio
            speed: Playback speed
            voice_id: Voice identifier

        Returns:
            Path to generated audio file, or None if generation failed
        """
        output_path = self.cache_dir / f"{cache_key}.mp3"

        # Try pyttsx3 first (offline)
        if self._pyttsx3_engine:
            try:
                temp_path = self.cache_dir / f"{cache_key}_temp.wav"
                self._pyttsx3_engine.save_to_file(text, str(temp_path))
                self._pyttsx3_engine.runAndWait()

                # Convert WAV to MP3 and adjust speed if needed
                if temp_path.exists():
                    self._convert_and_adjust_speed(temp_path, output_path, speed)
                    temp_path.unlink()  # Remove temp file
                    logger.info(f"Generated audio with pyttsx3: {output_path}")
                    return output_path
            except Exception as e:
                logger.warning(f"pyttsx3 generation failed: {e}")

        # Try gTTS if online mode enabled
        if self.online_mode and gTTS:
            try:
                tts = gTTS(text=text, lang=self.language, slow=(speed == 0.75))
                temp_path = self.cache_dir / f"{cache_key}_temp.mp3"
                tts.save(str(temp_path))

                # Adjust speed if needed (gTTS slow mode might not be exact)
                if temp_path.exists():
                    if speed != 1.0:
                        self._adjust_speed(temp_path, output_path, speed)
                        temp_path.unlink()
                    else:
                        temp_path.rename(output_path)
                    logger.info(f"Generated audio with gTTS: {output_path}")
                    return output_path
            except Exception as e:
                logger.warning(f"gTTS generation failed: {e}")

        return None

    def _convert_and_adjust_speed(
        self, input_path: Path, output_path: Path, speed: float
    ) -> None:
        """Convert audio format and adjust speed.

        Args:
            input_path: Input audio file path
            output_path: Output audio file path
            speed: Playback speed multiplier
        """
        if not AudioSegment:
            # If pydub not available, just copy the file
            import shutil
            shutil.copy(input_path, output_path)
            return

        try:
            audio = AudioSegment.from_file(str(input_path))
            if speed != 1.0:
                # Adjust speed: speedup/slowdown
                audio = audio._spawn(
                    audio.raw_data, overrides={"frame_rate": int(audio.frame_rate * speed)}
                )
            audio.export(str(output_path), format="mp3")
        except Exception as e:
            logger.warning(f"Audio conversion failed: {e}")
            # Fallback: just copy the file
            import shutil
            shutil.copy(input_path, output_path)

    def _adjust_speed(self, input_path: Path, output_path: Path, speed: float) -> None:
        """Adjust audio playback speed.

        Args:
            input_path: Input audio file path
            output_path: Output audio file path
            speed: Playback speed multiplier
        """
        if not AudioSegment:
            import shutil
            shutil.copy(input_path, output_path)
            return

        try:
            audio = AudioSegment.from_file(str(input_path))
            if speed != 1.0:
                audio = audio._spawn(
                    audio.raw_data, overrides={"frame_rate": int(audio.frame_rate * speed)}
                )
            audio.export(str(output_path), format="mp3")
        except Exception as e:
            logger.warning(f"Speed adjustment failed: {e}")
            import shutil
            shutil.copy(input_path, output_path)

    def cleanup_cache(self, max_age_days: int = 30) -> int:
        """Clean up old cached audio files.

        Args:
            max_age_days: Maximum age in days for cached files

        Returns:
            Number of files removed
        """
        import time

        removed_count = 0
        cutoff_time = time.time() - (max_age_days * 24 * 60 * 60)

        for cache_file in self.cache_dir.glob("*.mp3"):
            try:
                if cache_file.stat().st_mtime < cutoff_time:
                    cache_file.unlink()
                    removed_count += 1
            except Exception as e:
                logger.warning(f"Failed to remove cache file {cache_file}: {e}")

        logger.info(f"Cleaned up {removed_count} old cache files")
        return removed_count

