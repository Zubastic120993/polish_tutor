"""OpenAI-powered Speech-to-Text service for Phase B."""

from __future__ import annotations

import base64
import binascii
import logging
import os
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Any, Dict, Iterable

from openai import OpenAI

from src.schemas.v2.speech import SpeechRecognitionResponse, WordTiming

logger = logging.getLogger(__name__)


class WhisperSTTService:
    """Wrapper around the official OpenAI GPT-4o STT endpoint."""

    def __init__(self, engine: str | None = None):
        # Correct default STT model
        self.engine = engine or os.getenv("STT_ENGINE", "gpt-4o-transcribe")

        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            logger.warning(
                "OPENAI_API_KEY is not configured. STT requests will fail at runtime."
            )
            self.client = OpenAI()
        else:
            self.client = OpenAI(api_key=api_key)

        logger.info(f"[STT] Engine set to: {self.engine}")

    def transcribe_base64(self, audio_base64: str) -> SpeechRecognitionResponse:
        """Decode Base64 audio and submit it to OpenAI for transcription."""
        temp_path: Path | None = None

        try:
            # Decode Base64 → write temp wav
            temp_path = self.decode_base64_to_tempfile(audio_base64)

            logger.info(f"[STT] Temp file created: {temp_path}")
            logger.info(f"[STT] Size: {temp_path.stat().st_size} bytes")

            with temp_path.open("rb") as audio_file:

                # === CORRECT OPENAI CALL ===
                transcription = self.client.audio.transcriptions.create(
                    file=audio_file,
                    model=self.engine,
                    response_format="json",       # FIXED: must be json
                    timestamp_granularities=["word"],
                )

            return self.build_response_from_openai(transcription)

        except ValueError:
            raise
        except Exception as exc:
            logger.exception("OpenAI transcription failed")
            raise RuntimeError("Speech recognition service is unavailable") from exc
        finally:
            if temp_path and temp_path.exists():
                try:
                    temp_path.unlink()
                except OSError:
                    logger.warning(f"Failed to delete temporary file: {temp_path}")

    def decode_base64_to_tempfile(self, audio_base64: str) -> Path:
        """Decode a Base64 audio string into a temporary .wav file."""
        if not audio_base64:
            raise ValueError("audio_base64 payload is required")

        try:
            audio_bytes = base64.b64decode(audio_base64, validate=True)
        except binascii.Error as exc:
            raise ValueError("Invalid Base64 audio payload") from exc

        if not audio_bytes:
            raise ValueError("Decoded audio payload is empty")

        with NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio:
            temp_audio.write(audio_bytes)
            temp_audio.flush()
            return Path(temp_audio.name)

    def build_response_from_openai(
        self, transcription_result: Any
    ) -> SpeechRecognitionResponse:
        """Convert OpenAI JSON STT response to our schema."""

        payload = self._normalise_response(transcription_result)

        transcript = (
            payload.get("text")
            or payload.get("transcript")
            or payload.get("text_raw")
            or ""
        ).strip()

        words_raw: Iterable[Dict[str, Any]] = payload.get("words") or []
        words: list[WordTiming] = []

        for w in words_raw:
            word = w.get("word") or w.get("text")
            if not word:
                continue

            start = float(w.get("start", 0.0))
            end = float(w.get("end", start))

            words.append(WordTiming(word=word, start=start, end=end))

        # Fallback if no timestamps provided
        if not words and transcript:
            words.append(WordTiming(word=transcript, start=0.0, end=0.0))

        return SpeechRecognitionResponse(transcript=transcript, words=words)

    @staticmethod
    def _normalise_response(result: Any) -> Dict[str, Any]:
        """Return a plain dict regardless of OpenAI SDK object form."""
        if result is None:
            return {}

        if hasattr(result, "model_dump"):
            return result.model_dump()

        if hasattr(result, "dict"):
            return result.dict()  # type: ignore[return-value]

        if isinstance(result, dict):
            return result

        return {}
