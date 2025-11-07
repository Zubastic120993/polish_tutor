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
                    "audio_speed": 1.0,
                    "confidence_slider": 3,
                    "theme": "light",
                    "language": "en",
                }
            }
        
        # Convert settings list to dict
        settings_dict = {"user_id": user_id}
        for setting in user_settings_list:
            settings_dict[setting.key] = setting.value
        
        # Set defaults for missing keys
        settings_dict.setdefault("voice_mode", "offline")
        settings_dict.setdefault("audio_speed", 1.0)
        settings_dict.setdefault("confidence_slider", 3)
        settings_dict.setdefault("theme", "light")
        settings_dict.setdefault("language", "en")
        
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
        
        # Update each setting using upsert
        if request.voice_mode is not None:
            database.upsert_setting(request.user_id, "voice_mode", request.voice_mode)
            settings_dict["voice_mode"] = request.voice_mode
        else:
            setting = database.get_user_setting(request.user_id, "voice_mode")
            settings_dict["voice_mode"] = setting.value if setting else "offline"
        
        if request.audio_speed is not None:
            database.upsert_setting(request.user_id, "audio_speed", str(request.audio_speed))
            settings_dict["audio_speed"] = request.audio_speed
        else:
            setting = database.get_user_setting(request.user_id, "audio_speed")
            settings_dict["audio_speed"] = float(setting.value) if setting else 1.0
        
        if request.confidence_slider is not None:
            database.upsert_setting(request.user_id, "confidence_slider", str(request.confidence_slider))
            settings_dict["confidence_slider"] = request.confidence_slider
        else:
            setting = database.get_user_setting(request.user_id, "confidence_slider")
            settings_dict["confidence_slider"] = int(setting.value) if setting else 3
        
        if request.theme is not None:
            database.upsert_setting(request.user_id, "theme", request.theme)
            settings_dict["theme"] = request.theme
        else:
            setting = database.get_user_setting(request.user_id, "theme")
            settings_dict["theme"] = setting.value if setting else "light"
        
        if request.language is not None:
            database.upsert_setting(request.user_id, "language", request.language)
            settings_dict["language"] = request.language
        else:
            setting = database.get_user_setting(request.user_id, "language")
            settings_dict["language"] = setting.value if setting else "en"
        
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

