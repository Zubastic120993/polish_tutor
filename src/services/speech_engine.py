"""Simplified Murf-only speech engine with local caching."""

from __future__ import annotations

import hashlib
import logging
import os
import time
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import httpx

DEFAULT_MURF_VOICE = os.getenv("MURF_VOICE_ID") or "pl-PL-jacek"
DEFAULT_MURF_STYLE = os.getenv("MURF_VOICE_STYLE") or "Conversational"

logger = logging.getLogger(__name__)


class SpeechEngine:
    """Generate or retrieve speech audio using Murf.ai."""

    BASE_URL = "https://api.murf.ai/v1"

    def __init__(
        self,
        native_audio_dir: Optional[str] = None,
        cache_dir: Optional[str] = None,
        murf_api_key: Optional[str] = None,
        default_voice_id: str = DEFAULT_MURF_VOICE,
        language: str = "pl",
        voice_style: str = DEFAULT_MURF_STYLE,
        timeout: float = 30.0,
        poll_interval: float = 2.0,
        max_wait_seconds: float = 300.0,
    ) -> None:
        self.native_audio_dir = Path(
            native_audio_dir or "./frontend/static/audio/native"
        )
        self.cache_dir = Path(cache_dir or "./audio_cache")
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        self.murf_api_key = murf_api_key or os.getenv("MURF_API_KEY")
        self.default_voice_id = default_voice_id
        self.language = language
        self.voice_style = voice_style
        self.timeout = timeout
        self.poll_interval = poll_interval
        self.max_wait_seconds = max_wait_seconds

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def generate_cache_key(
        self,
        text: str,
        voice_id: str,
        speed: float,
    ) -> str:
        key_string = f"{text.strip().lower()}:{voice_id}:{speed:.2f}"
        return hashlib.md5(key_string.encode("utf-8")).hexdigest()

    def get_audio_path(
        self,
        text: str,
        lesson_id: Optional[str] = None,
        phrase_id: Optional[str] = None,
        audio_filename: Optional[str] = None,
        speed: float = 1.0,
        voice_id: Optional[str] = None,
    ) -> Tuple[Optional[str], str]:
        """Return local path to audio for the requested text.

        Returns:
            A tuple of (path, source_type), where:
                - path is a string path to the audio file
                - source_type is one of: "pre_recorded", "cached_murf", "generated_murf"
        """
        voice = voice_id or self.default_voice_id

        # First check for bundled audio
        pre_recorded = self._check_pre_recorded(
            lesson_id=lesson_id,
            phrase_id=phrase_id,
            audio_filename=audio_filename,
            speed=speed,
        )
        if pre_recorded:
            return str(pre_recorded), "pre_recorded"

        cache_key = self.generate_cache_key(text, voice, speed)
        cache_path = self._cache_file_path(cache_key)
        if cache_path.exists():
            return str(cache_path), "cached_murf"

        generated_path = self._synthesize_with_murf(
            text=text,
            voice_id=voice,
            speed=speed,
            output_path=cache_path,
        )
        return str(generated_path), "generated_murf"

    def get_available_engines(self) -> dict:
        """Return metadata about TTS availability."""
        return {
            "mode": "online",
            "online": {"murf": bool(self.murf_api_key)},
            "offline": {},
        }

    def cleanup_cache(self, max_age_days: int = 30) -> int:
        """Remove cache files older than `max_age_days`.

        Returns:
            Number of files removed.
        """
        cutoff = time.time() - (max_age_days * 86400)
        removed = 0
        for path in self.cache_dir.rglob("*.mp3"):
            try:
                if path.stat().st_mtime < cutoff:
                    path.unlink()
                    removed += 1
            except OSError:
                continue
        return removed

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _check_pre_recorded(
        self,
        lesson_id: Optional[str],
        phrase_id: Optional[str],
        audio_filename: Optional[str],
        speed: float,
    ) -> Optional[Path]:
        """Check if there is a pre-recorded file matching the request."""
        if not lesson_id or not (phrase_id or audio_filename):
            return None

        base_dir = self.native_audio_dir / lesson_id
        if not base_dir.exists():
            return None

        base_name = audio_filename or phrase_id
        speed_suffix = "_slow" if speed < 1.0 else "_fast" if speed > 1.0 else ""
        candidates = []

        if speed_suffix:
            candidates.append(base_dir / f"{base_name}{speed_suffix}.mp3")
        candidates.append(base_dir / f"{base_name}.mp3")

        for candidate in candidates:
            if candidate.exists():
                return candidate
        return None

    def _cache_file_path(self, cache_key: str) -> Path:
        """Return a nested path for the given cache key."""
        subdir = self.cache_dir / cache_key[:2]
        subdir.mkdir(parents=True, exist_ok=True)
        return subdir / f"{cache_key}.mp3"

    def _synthesize_with_murf(
        self,
        text: str,
        voice_id: str,
        speed: float,
        output_path: Path,
    ) -> Path:
        """Generate speech using the Murf API and save to output_path."""
        if not self.murf_api_key:
            raise RuntimeError("MURF_API_KEY is not configured")

        headers = {
            # Murf expects 'api-key' header
            "api-key": self.murf_api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        payload: Dict[str, Any] = {
            "voiceId": voice_id,
            "text": text,
            "format": "mp3",
            "encoding": "mp3",
        }
        if self.voice_style:
            payload["style"] = self.voice_style
        if self.language:
            payload["language"] = self.language
        if abs(speed - 1.0) > 1e-3:
            payload["speakingRate"] = speed

        output_path.parent.mkdir(parents=True, exist_ok=True)

        with httpx.Client(timeout=self.timeout) as client:
            response = client.post(
                f"{self.BASE_URL}/speech/generate",
                json=payload,
                headers=headers,
            )
            if response.status_code != 200:
                raise RuntimeError(
                    f"Murf TTS error: {response.status_code} – {response.text}"
                )

            data = response.json()
            audio_file_url = data.get("audioFile") or data.get("data", {}).get(
                "audioFile"
            )
            if not audio_file_url:
                raise RuntimeError("Murf TTS response missing audio URL")

            audio_resp = client.get(audio_file_url)
            audio_resp.raise_for_status()
            output_path.write_bytes(audio_resp.content)
        return output_path
