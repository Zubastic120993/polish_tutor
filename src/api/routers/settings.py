"""Settings API endpoints."""
import logging
from fastapi import APIRouter, HTTPException, Query

from src.api.schemas import SettingsGetResponse, SettingsUpdateRequest, SettingsUpdateResponse
from src.core.app_context import app_context
from src.models import Setting

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("/get", response_model=SettingsGetResponse, status_code=200)
async def settings_get(user_id: int = Query(..., description="User ID", gt=0)):
    """Load preferences for user profile.
    
    Args:
        user_id: User identifier
        
    Returns:
        User settings
    """
    try:
        database = app_context.database
        
        # Get settings from database
        # Note: Setting model uses key-value pairs, so we need to get all settings for user
        user_settings_list = database.get_user_settings(user_id)
        
        if not user_settings_list:
            
            # Return default settings
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
                }
            }
        
        # Convert settings list to dict
        settings_dict = {"user_id": user_id}
        for setting in user_settings_list:
            settings_dict[setting.key] = setting.value
        
        # Convert legacy audio_speed (float) to new format (string) if needed
        if "audio_speed" in settings_dict:
            try:
                # Try to parse as float (legacy format)
                speed_val = float(settings_dict["audio_speed"])
                if speed_val == 0.75:
                    settings_dict["audio_speed"] = "slow"
                elif speed_val == 1.0:
                    settings_dict["audio_speed"] = "normal"
                elif speed_val == 1.25:
                    settings_dict["audio_speed"] = "fast"
            except (ValueError, TypeError):
                # Already in string format, keep as is
                pass
        
        # Set defaults for missing keys
        settings_dict.setdefault("voice_mode", "offline")
        settings_dict.setdefault("audio_speed", "normal")
        settings_dict.setdefault("translation", "smart")
        settings_dict.setdefault("mic_mode", "tap")
        settings_dict.setdefault("tutor_mode", "coach")
        settings_dict.setdefault("voice", "neutral")
        settings_dict.setdefault("audio_output", "speakers")
        settings_dict.setdefault("theme", "light")
        settings_dict.setdefault("language", "en")
        settings_dict.setdefault("confidence_slider", 3)
        settings_dict.setdefault("profile_template", None)
        
        return {
            "status": "success",
            "message": "Settings retrieved successfully",
            "data": settings_dict
        }
        
    except Exception as e:
        logger.error(f"Error in settings_get: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@router.post("/update", response_model=SettingsUpdateResponse, status_code=200)
async def settings_update(request: SettingsUpdateRequest):
    """Save preferences snapshot.
    
    Args:
        request: Settings update request
        
    Returns:
        Updated settings
    """
    try:
        database = app_context.database
        
        # Settings are stored as key-value pairs
        settings_dict = {"user_id": request.user_id}
        
        # Helper function to get or set setting
        def get_or_set_setting(key: str, value, default):
            if value is not None:
                database.upsert_setting(request.user_id, key, str(value))
                return value
            else:
                setting = database.get_user_setting(request.user_id, key)
                return setting.value if setting else default
        
        # Update each setting using upsert
        settings_dict["voice_mode"] = get_or_set_setting("voice_mode", request.voice_mode, "offline")
        settings_dict["audio_speed"] = get_or_set_setting("audio_speed", request.audio_speed, "normal")
        settings_dict["translation"] = get_or_set_setting("translation", request.translation, "smart")
        settings_dict["mic_mode"] = get_or_set_setting("mic_mode", request.mic_mode, "tap")
        settings_dict["tutor_mode"] = get_or_set_setting("tutor_mode", request.tutor_mode, "coach")
        settings_dict["voice"] = get_or_set_setting("voice", request.voice, "neutral")
        settings_dict["audio_output"] = get_or_set_setting("audio_output", request.audio_output, "speakers")
        settings_dict["theme"] = get_or_set_setting("theme", request.theme, "light")
        settings_dict["language"] = get_or_set_setting("language", request.language, "en")
        settings_dict["confidence_slider"] = int(get_or_set_setting("confidence_slider", request.confidence_slider, 3))
        settings_dict["profile_template"] = get_or_set_setting("profile_template", request.profile_template, None)
        
        return {
            "status": "success",
            "message": "Settings updated successfully",
            "data": settings_dict
        }
        
    except Exception as e:
        logger.error(f"Error in settings_update: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

