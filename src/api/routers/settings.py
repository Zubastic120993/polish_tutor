"""Settings API endpoints."""

import logging
from fastapi import APIRouter, HTTPException, Query

from src.api.schemas import (
    SettingsGetResponse,
    SettingsUpdateRequest,
    SettingsUpdateResponse,
)
from src.core.app_context import app_context

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("/get", response_model=SettingsGetResponse, status_code=200)
async def settings_get(user_id: int = Query(..., description="User ID", gt=0)):
    """Load preferences for user profile."""
    try:
        database = app_context.database

        # get_user_settings() → Dict[str, Any]
        user_settings = database.get_user_settings(user_id)

        if not user_settings:
            # Default fallback
            return {
                "status": "success",
                "message": "Using default settings",
                "data": {
                    "user_id": user_id,
                    "voice_mode": "offline",
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
            }

        # Convert dict to response object
        settings_dict: dict[str, str | int | None] = {"user_id": user_id}
        for key, value in user_settings.items():
            settings_dict[key] = value

        # Convert legacy numeric audio speed → named values
        if "audio_speed" in settings_dict:
            try:
                speed_val = float(settings_dict["audio_speed"])  # type: ignore[arg-type]
                if speed_val == 0.75:
                    settings_dict["audio_speed"] = "slow"
                elif speed_val == 1.0:
                    settings_dict["audio_speed"] = "normal"
                elif speed_val == 1.25:
                    settings_dict["audio_speed"] = "fast"
            except (ValueError, TypeError):
                pass

        # Confidence slider as int
        raw_conf = settings_dict.get("confidence_slider", 3)
        try:
            settings_dict["confidence_slider"] = int(raw_conf)  # type: ignore[arg-type]
        except (TypeError, ValueError):
            settings_dict["confidence_slider"] = 3

        # Ensure defaults
        settings_dict.setdefault("voice_mode", "offline")
        settings_dict.setdefault("audio_speed", "normal")
        settings_dict.setdefault("translation", "smart")
        settings_dict.setdefault("mic_mode", "tap")
        settings_dict.setdefault("tutor_mode", "coach")
        settings_dict.setdefault("voice", "neutral")
        settings_dict.setdefault("audio_output", "speakers")
        settings_dict.setdefault("theme", "light")
        settings_dict.setdefault("language", "en")
        settings_dict.setdefault("profile_template", None)

        return {
            "status": "success",
            "message": "Settings retrieved successfully",
            "data": settings_dict,
        }

    except Exception as e:
        logger.error(f"Error in settings_get: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/update", response_model=SettingsUpdateResponse, status_code=200)
async def settings_update(request: SettingsUpdateRequest):
    """Save preferences snapshot."""
    try:
        database = app_context.database

        settings_dict: dict[str, str | int | None] = {"user_id": request.user_id}

        # Helper for inserting or reading values
        def get_or_set_setting(
            key: str, value: str | int | None, default: str | int | None
        ) -> str | int | None:
            if value is not None:
                database.upsert_setting(request.user_id, key, str(value))
                return value
            existing_value = database.get_user_setting(request.user_id, key)
            return existing_value if existing_value is not None else default

        # Apply all settings
        settings_dict["voice_mode"] = get_or_set_setting("voice_mode", request.voice_mode, "offline")
        settings_dict["audio_speed"] = get_or_set_setting("audio_speed", request.audio_speed, "normal")
        settings_dict["translation"] = get_or_set_setting("translation", request.translation, "smart")
        settings_dict["mic_mode"] = get_or_set_setting("mic_mode", request.mic_mode, "tap")
        settings_dict["tutor_mode"] = get_or_set_setting("tutor_mode", request.tutor_mode, "coach")
        settings_dict["voice"] = get_or_set_setting("voice", request.voice, "neutral")
        settings_dict["audio_output"] = get_or_set_setting("audio_output", request.audio_output, "speakers")
        settings_dict["theme"] = get_or_set_setting("theme", request.theme, "light")
        settings_dict["language"] = get_or_set_setting("language", request.language, "en")

        raw_conf = get_or_set_setting("confidence_slider", request.confidence_slider, 3)
        try:
            settings_dict["confidence_slider"] = int(raw_conf) if raw_conf is not None else 3
        except (TypeError, ValueError):
            settings_dict["confidence_slider"] = 3

        settings_dict["profile_template"] = get_or_set_setting("profile_template", request.profile_template, None)

        return {
            "status": "success",
            "message": "Settings updated successfully",
            "data": settings_dict,
        }

    except Exception as e:
        logger.error(f"Error in settings_update: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
        