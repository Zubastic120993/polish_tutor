"""Audio API endpoints powered by the Murf REST API."""

from __future__ import annotations

import logging
import os
import uuid
from pathlib import Path
from typing import Optional, Union

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
import httpx
from pydantic import BaseModel, ConfigDict

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/audio", tags=["audio"])
_AUDIO_CACHE_DIR = Path("audio_cache")
_MURF_API_URL = "https://api.murf.ai/v1/speech/generate"
_DEFAULT_VOICE_ID = os.getenv("MURF_VOICE_ID") or "pl-PL-jacek"
_DEFAULT_VOICE_STYLE = os.getenv("MURF_VOICE_STYLE") or "Conversational"


class AudioRequest(BaseModel):
    """Payload for audio generation requests."""

    text: str
    speed: float = 1.0
    user_id: Optional[Union[str, int]] = None

    model_config = ConfigDict(extra="ignore")


async def _generate_polish_tts(api_key: str, text: str, speed: float) -> bytes:
    payload = {
        "voiceId": _DEFAULT_VOICE_ID,
        "text": text,
        "format": "mp3",
        "encoding": "mp3",
        "style": _DEFAULT_VOICE_STYLE,
    }
    if speed and abs(speed - 1.0) > 1e-3:
        payload["speakingRate"] = speed

    headers = {
        "api-key": api_key,
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(_MURF_API_URL, json=payload, headers=headers)
        if response.status_code != 200:
            raise RuntimeError(f"Murf error: {response.text}")

        data = response.json()
        audio_file_url = data.get("audioFile") or data.get("data", {}).get("audioFile")
        if not audio_file_url:
            raise RuntimeError("Murf response missing audio URL")

        audio_resp = await client.get(audio_file_url)
        audio_resp.raise_for_status()
        return audio_resp.content


@router.post("/generate", status_code=200)
async def generate_audio(request: AudioRequest):
    """Generate tutor audio via the Murf SDK."""

    api_key = os.getenv("MURF_API_KEY") or ""
    placeholder_tokens = {"your_real_api_key_here", "<your_api_key_here>"}
    if not api_key or api_key.strip().lower() in placeholder_tokens:
        raise HTTPException(status_code=500, detail="MURF_API_KEY not configured")

    text = (request.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")

    speed = request.speed or 1.0

    try:
        audio_bytes = await _generate_polish_tts(api_key, text, speed)
        _AUDIO_CACHE_DIR.mkdir(parents=True, exist_ok=True)
        filename = f"{uuid.uuid4()}.mp3"
        file_path = _AUDIO_CACHE_DIR / filename
        file_path.write_bytes(audio_bytes)

        payload = {
            "status": "success",
            "message": "Audio generated via Murf",
            "data": {"audio_url": f"/audio_cache/{filename}"},
        }
        return JSONResponse(payload)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("TTS generation failed", exc_info=True)
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {exc}")


@router.get("/engines", status_code=200)
async def get_available_engines():
    """Report availability of the Murf engine."""

    available = bool(os.getenv("MURF_API_KEY"))
    return {
        "status": "success",
        "message": "Retrieved TTS engine information",
        "data": {
            "mode": "online",
            "online": {"murf": available},
            "offline": {},
        },
    }


@router.post("/clear-cache", status_code=200)
async def audio_clear_cache():
    """Clear all cached audio files."""

    try:
        if not _AUDIO_CACHE_DIR.exists():
            return {
                "status": "success",
                "message": "Audio cache directory does not exist",
                "data": {"files_cleared": 0},
            }

        files_cleared = 0
        for cache_file in _AUDIO_CACHE_DIR.glob("*.mp3"):
            try:
                cache_file.unlink()
                files_cleared += 1
            except Exception as exc:
                logger.warning(f"Failed to remove cache file {cache_file}: {exc}")

        logger.info("Cleared %s audio cache files", files_cleared)

        return {
            "status": "success",
            "message": f"Cleared {files_cleared} cached audio files",
            "data": {"files_cleared": files_cleared},
        }

    except Exception as exc:
        logger.error("Error clearing audio cache", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {exc}")
