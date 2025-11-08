"""Speech Engine for text-to-speech with multi-engine fallback chain.

Priority Chain:
- Online Mode: GPT-4-TTS → ElevenLabs → gTTS (legacy)
- Offline Mode: Coqui-TTS → pyttsx3 (emergency)
"""
import hashlib
import logging
import os
from pathlib import Path
from typing import Optional, Tuple
import tempfile

# Set Coqui-TTS license acceptance before importing TTS
# This accepts the Coqui Public Model License (CPML) non-interactively
os.environ["COQUI_TOS_AGREED"] = "1"

# Optional imports with graceful fallback
try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

try:
    from elevenlabs.client import ElevenLabs
    from elevenlabs import save
except ImportError:
    ElevenLabs = None
    save = None

try:
    from TTS.api import TTS
except ImportError:
    TTS = None

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
        openai_api_key: Optional[str] = None,
        elevenlabs_api_key: Optional[str] = None,
    ):
        """Initialize SpeechEngine.

        Args:
            native_audio_dir: Directory for pre-recorded audio files
            cache_dir: Directory for cached generated audio
            language: Language code for TTS (default: "pl" for Polish)
            online_mode: Whether to use online TTS services
            openai_api_key: OpenAI API key for GPT-4-TTS
            elevenlabs_api_key: ElevenLabs API key
        """
        self.native_audio_dir = Path(native_audio_dir or "./static/audio/native")
        self.cache_dir = Path(cache_dir or "./audio_cache")
        self.language = language
        self.online_mode = online_mode

        # Create cache directory if it doesn't exist
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        # Initialize OpenAI client (GPT-4-TTS)
        self._openai_client = None
        if OpenAI and openai_api_key:
            try:
                self._openai_client = OpenAI(api_key=openai_api_key)
                logger.info("✅ OpenAI GPT-4-TTS initialized")
            except Exception as e:
                logger.warning(f"Failed to initialize OpenAI client: {e}")

        # Initialize ElevenLabs client
        self._elevenlabs_client = None
        if ElevenLabs and elevenlabs_api_key:
            try:
                self._elevenlabs_client = ElevenLabs(api_key=elevenlabs_api_key)
                logger.info("✅ ElevenLabs TTS initialized")
            except Exception as e:
                logger.warning(f"Failed to initialize ElevenLabs client: {e}")

        # Coqui-TTS will be initialized lazily when needed (to avoid blocking startup)
        self._coqui_tts = None
        self._coqui_tts_initialized = False
        self._coqui_tts_available = TTS is not None and not online_mode

        # Initialize pyttsx3 (emergency fallback)
        self._pyttsx3_engine = None
        if pyttsx3:
            try:
                self._pyttsx3_engine = pyttsx3.init()
                
                # Set slower, more natural rate
                try:
                    self._pyttsx3_engine.setProperty("rate", 150)
                    self._pyttsx3_engine.setProperty("volume", 0.9)
                except Exception:
                    pass
                
                # Try to find Polish voice
                try:
                    voices = self._pyttsx3_engine.getProperty("voices")
                    for voice in voices:
                        if "polish" in voice.name.lower() or "pl" in voice.id.lower():
                            self._pyttsx3_engine.setProperty("voice", voice.id)
                            logger.info(f"Using Polish voice: {voice.name}")
                            break
                except Exception:
                    pass
                    
                logger.info("✅ pyttsx3 initialized (emergency fallback)")
            except Exception as e:
                logger.warning(f"Failed to initialize pyttsx3: {e}")
                self._pyttsx3_engine = None

    def generate_cache_key(
        self, text: str, voice_id: str = "default", speed: float = 1.0, engine: str = "auto"
    ) -> str:
        """Generate MD5 cache key for audio.

        Args:
            text: Text to synthesize
            voice_id: Voice identifier
            speed: Playback speed (0.75, 1.0, or 1.25)
            engine: Engine name (gpt4, elevenlabs, coqui, pyttsx3, gtts)

        Returns:
            MD5 hash string
        """
        key_string = f"{text}:{voice_id}:{speed}:{engine}"
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
        3. Online mode: GPT-4-TTS → ElevenLabs → gTTS
        4. Offline mode: Coqui-TTS → pyttsx3

        Args:
            text: Text to synthesize
            lesson_id: Lesson identifier (for pre-recorded audio lookup)
            phrase_id: Phrase identifier (for pre-recorded audio lookup)
            audio_filename: Explicit audio filename (from lesson JSON)
            speed: Playback speed (0.75, 1.0, or 1.25)
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

        # Priority 2: Check cache for all engine types
        for engine in ["gpt4", "elevenlabs", "coqui", "gtts", "pyttsx3"]:
            cache_key = self.generate_cache_key(text, voice_id, speed, engine)
            cached_path = self.cache_dir / f"{cache_key}.mp3"
            if cached_path.exists():
                logger.debug(f"Found cached audio: {cached_path} (engine: {engine})")
                return (cached_path, f"cached_{engine}")

        # Priority 3: Generate new audio
        generated_path, engine = self._generate_audio(text, speed, voice_id)
        if generated_path:
            return (generated_path, f"generated_{engine}")

        # No audio available
        return (None, "unavailable")

    def _check_pre_recorded(
        self,
        lesson_id: str,
        phrase_id: Optional[str],
        audio_filename: Optional[str],
        speed: float,
    ) -> Optional[Path]:
        """Check for pre-recorded audio file."""
        lesson_audio_dir = self.native_audio_dir / lesson_id

        # Try explicit filename first
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
        self, text: str, speed: float, voice_id: str
    ) -> Tuple[Optional[Path], str]:
        """Generate audio using available TTS engine.

        Args:
            text: Text to synthesize
            speed: Playback speed
            voice_id: Voice identifier

        Returns:
            Tuple of (Path to generated audio file, engine_name) or (None, "none") if generation failed
        """
        if self.online_mode:
            # Try GPT-4-TTS first (best quality)
            result = self._generate_with_gpt4_tts(text, speed, voice_id)
            if result:
                return result, "gpt4"

            # Try ElevenLabs (also excellent quality)
            result = self._generate_with_elevenlabs(text, speed, voice_id)
            if result:
                return result, "elevenlabs"

            # Fall back to gTTS (legacy online)
            result = self._generate_with_gtts(text, speed, voice_id)
            if result:
                return result, "gtts"
        else:
            # Try Coqui-TTS (offline, high quality)
            result = self._generate_with_coqui(text, speed, voice_id)
            if result:
                return result, "coqui"

        # Emergency fallback: pyttsx3
        result = self._generate_with_pyttsx3(text, speed, voice_id)
        if result:
            return result, "pyttsx3"

        return None, "none"

    def _generate_with_gpt4_tts(
        self, text: str, speed: float, voice_id: str
    ) -> Optional[Path]:
        """Generate audio using OpenAI GPT-4-TTS."""
        if not self._openai_client:
            return None

        try:
            logger.info(f"🎤 Generating audio with GPT-4-TTS for text: '{text[:50]}...'")
            
            # Determine voice (alloy, echo, fable, onyx, nova, shimmer)
            # For Polish, 'alloy' and 'nova' work well
            voice = voice_id if voice_id in ["alloy", "echo", "fable", "onyx", "nova", "shimmer"] else "alloy"
            
            # Generate audio
            response = self._openai_client.audio.speech.create(
                model="tts-1-hd",  # High quality model (tts-1-hd is better than tts-1)
                voice=voice,
                input=text,
                speed=speed,  # OpenAI supports speed parameter directly
            )
            
            # Save to cache
            cache_key = self.generate_cache_key(text, voice_id, speed, "gpt4")
            output_path = self.cache_dir / f"{cache_key}.mp3"
            
            response.stream_to_file(str(output_path))
            
            logger.info(f"✅ Successfully generated audio with GPT-4-TTS: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"❌ GPT-4-TTS generation failed: {e}", exc_info=True)
            return None

    def _generate_with_elevenlabs(
        self, text: str, speed: float, voice_id: str
    ) -> Optional[Path]:
        """Generate audio using ElevenLabs TTS."""
        if not self._elevenlabs_client or not save:
            return None

        try:
            logger.info(f"🎤 Generating audio with ElevenLabs for text: '{text[:50]}...'")
            
            # Use ElevenLabs multilingual v2 model
            # Voice IDs: You can use pre-made voices or custom ones
            # For Polish, "Adam" (pNInz6obpgDQGcFmaJgB) works well
            voice = voice_id if len(voice_id) > 10 else "pNInz6obpgDQGcFmaJgB"
            
            # Generate audio
            audio_generator = self._elevenlabs_client.generate(
                text=text,
                voice=voice,
                model="eleven_multilingual_v2",
            )
            
            # Save to cache
            cache_key = self.generate_cache_key(text, voice_id, speed, "elevenlabs")
            temp_path = self.cache_dir / f"{cache_key}_temp.mp3"
            output_path = self.cache_dir / f"{cache_key}.mp3"
            
            # Save the audio
            save(audio_generator, str(temp_path))
            
            # Adjust speed if needed
            if speed != 1.0 and AudioSegment:
                self._adjust_speed(temp_path, output_path, speed)
                temp_path.unlink()
            else:
                temp_path.rename(output_path)
            
            logger.info(f"✅ Successfully generated audio with ElevenLabs: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"❌ ElevenLabs generation failed: {e}", exc_info=True)
            return None

    def _ensure_coqui_initialized(self) -> bool:
        """Lazily initialize Coqui-TTS when needed.
        
        Returns:
            True if Coqui-TTS is available and initialized, False otherwise
        """
        if self._coqui_tts_initialized:
            return self._coqui_tts is not None
        
        if not self._coqui_tts_available:
            return False
        
        self._coqui_tts_initialized = True
        
        try:
            # Use a multi-lingual model that supports Polish
            # Model: "tts_models/multilingual/multi-dataset/xtts_v2"
            # Note: COQUI_TOS_AGREED is set at module level to accept license non-interactively
            logger.info("🔄 Initializing Coqui-TTS (this may take a moment)...")
            self._coqui_tts = TTS(model_name="tts_models/multilingual/multi-dataset/xtts_v2")
            logger.info("✅ Coqui-TTS initialized (offline mode)")
            return True
        except Exception as e:
            logger.warning(f"Failed to initialize Coqui-TTS: {e}")
            self._coqui_tts = None
            return False
    
    def _generate_with_coqui(
        self, text: str, speed: float, voice_id: str
    ) -> Optional[Path]:
        """Generate audio using Coqui-TTS (offline)."""
        if not self._ensure_coqui_initialized() or not self._coqui_tts:
            return None

        try:
            logger.info(f"🔊 Generating audio with Coqui-TTS (offline) for text: '{text[:50]}...'")
            
            # Generate cache key
            cache_key = self.generate_cache_key(text, voice_id, speed, "coqui")
            temp_path = self.cache_dir / f"{cache_key}_temp.wav"
            output_path = self.cache_dir / f"{cache_key}.mp3"
            
            # Generate audio with Coqui XTTS v2
            # XTTS v2 requires either speaker_wav (reference audio) or speaker_id
            # Since we don't have pre-recorded reference audio, we'll generate a simple
            # reference audio using pyttsx3 first, then use it for voice cloning
            # This creates a consistent voice for Polish TTS
            
            # Create a reference audio file for voice cloning (if not exists)
            ref_audio_dir = self.cache_dir / "coqui_ref"
            ref_audio_dir.mkdir(exist_ok=True)
            ref_audio_path = ref_audio_dir / "polish_ref.wav"
            
            # Generate reference audio if it doesn't exist
            if not ref_audio_path.exists() and self._pyttsx3_engine:
                try:
                    ref_text = "Dzień dobry"  # Simple Polish reference text
                    self._pyttsx3_engine.save_to_file(ref_text, str(ref_audio_path))
                    self._pyttsx3_engine.runAndWait()
                    logger.info(f"Created reference audio for Coqui-TTS: {ref_audio_path}")
                except Exception as e:
                    logger.warning(f"Failed to create reference audio: {e}")
                    # Fall back to pyttsx3 if we can't create reference
                    return None
            
            # Use reference audio for voice cloning
            if ref_audio_path.exists():
                self._coqui_tts.tts_to_file(
                    text=text,
                    file_path=str(temp_path),
                    language="pl",
                    speaker_wav=str(ref_audio_path),  # Use reference audio for voice cloning
                )
            else:
                # If no reference audio, try without speaker (may not work)
                logger.warning("No reference audio available, trying without speaker_wav")
                self._coqui_tts.tts_to_file(
                    text=text,
                    file_path=str(temp_path),
                    language="pl",
                )
            
            # Convert WAV to MP3 and adjust speed
            if temp_path.exists() and AudioSegment:
                audio = AudioSegment.from_file(str(temp_path))
                
                # Adjust speed if needed
                if speed != 1.0:
                    audio = audio._spawn(
                        audio.raw_data, 
                        overrides={"frame_rate": int(audio.frame_rate * speed)}
                    )
                    audio = audio.set_frame_rate(audio.frame_rate)
                
                audio.export(str(output_path), format="mp3", bitrate="128k")
                temp_path.unlink()
                
                logger.info(f"✅ Successfully generated audio with Coqui-TTS: {output_path}")
                return output_path
            else:
                logger.error("Coqui-TTS temp file was not created or AudioSegment not available")
                return None
            
        except Exception as e:
            logger.error(f"❌ Coqui-TTS generation failed: {e}", exc_info=True)
            return None

    def _generate_with_gtts(
        self, text: str, speed: float, voice_id: str
    ) -> Optional[Path]:
        """Generate audio using gTTS (legacy online)."""
        if not gTTS:
            return None

        try:
            logger.info(f"🎤 Generating audio with gTTS (legacy) for text: '{text[:50]}...'")
            
            # gTTS slow=True is approximately 0.75x speed
            use_slow = speed <= 0.8
            tts = gTTS(text=text, lang=self.language, slow=use_slow)
            
            cache_key = self.generate_cache_key(text, voice_id, speed, "gtts")
            temp_path = self.cache_dir / f"{cache_key}_temp.mp3"
            output_path = self.cache_dir / f"{cache_key}.mp3"
            
            tts.save(str(temp_path))

            # Adjust speed if needed
            if temp_path.exists():
                if speed == 1.25:
                    self._adjust_speed(temp_path, output_path, 1.25)
                    temp_path.unlink()
                elif speed == 0.75 and not use_slow:
                    self._adjust_speed(temp_path, output_path, 0.75)
                    temp_path.unlink()
                else:
                    temp_path.rename(output_path)
                    
                logger.info(f"✅ Successfully generated audio with gTTS: {output_path}")
                return output_path
            else:
                logger.error("gTTS temp file was not created")
                return None
                
        except Exception as e:
            logger.error(f"❌ gTTS generation failed: {e}", exc_info=True)
            return None

    def _generate_with_pyttsx3(
        self, text: str, speed: float, voice_id: str
    ) -> Optional[Path]:
        """Generate audio using pyttsx3 (emergency fallback)."""
        if not self._pyttsx3_engine:
            return None

        try:
            logger.info(f"🔊 Generating audio with pyttsx3 (emergency) for text: '{text[:50]}...'")
            
            # Adjust rate based on speed
            base_rate = 150
            if speed == 0.75:
                rate = int(base_rate * 0.85)
            elif speed == 1.25:
                rate = int(base_rate * 1.1)
            else:
                rate = base_rate
            
            try:
                self._pyttsx3_engine.setProperty("rate", rate)
            except Exception:
                pass
            
            cache_key = self.generate_cache_key(text, voice_id, speed, "pyttsx3")
            temp_path = self.cache_dir / f"{cache_key}_temp.wav"
            output_path = self.cache_dir / f"{cache_key}.mp3"
            
            self._pyttsx3_engine.save_to_file(text, str(temp_path))
            self._pyttsx3_engine.runAndWait()

            # Convert WAV to MP3
            if temp_path.exists():
                if AudioSegment:
                    audio = AudioSegment.from_file(str(temp_path))
                    audio.export(str(output_path), format="mp3", bitrate="128k")
                else:
                    import shutil
                    shutil.copy(temp_path, output_path)
                temp_path.unlink()
                
                logger.info(f"✅ Successfully generated audio with pyttsx3: {output_path}")
                return output_path
            else:
                logger.error("pyttsx3 temp file was not created")
                return None
                
        except Exception as e:
            logger.error(f"❌ pyttsx3 generation failed: {e}", exc_info=True)
            return None

    def _adjust_speed(self, input_path: Path, output_path: Path, speed: float) -> None:
        """Adjust audio playback speed using pydub."""
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
                audio = audio.set_frame_rate(audio.frame_rate)
            audio.export(str(output_path), format="mp3", bitrate="128k")
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

    def get_available_engines(self) -> dict:
        """Get information about available TTS engines.
        
        Returns:
            Dictionary with engine availability and status
        """
        return {
            "online": {
                "gpt4_tts": self._openai_client is not None,
                "elevenlabs": self._elevenlabs_client is not None,
                "gtts": gTTS is not None,
            },
            "offline": {
                "coqui_tts": self._coqui_tts_available,  # Available but may not be initialized yet
                "pyttsx3": self._pyttsx3_engine is not None,
            },
            "mode": "online" if self.online_mode else "offline",
        }
