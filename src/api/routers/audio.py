"""Audio API endpoints."""
import logging
from fastapi import APIRouter, HTTPException

from src.api.schemas import AudioGenerateRequest, AudioGenerateResponse
from src.core.app_context import app_context

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/audio", tags=["audio"])


@router.post("/generate", response_model=AudioGenerateResponse, status_code=200)
async def audio_generate(request: AudioGenerateRequest):
    """Optional dynamic TTS generation (caches if new).
    
    Args:
        request: Audio generation request with text, lesson_id, phrase_id, speed
        
    Returns:
        Audio URL
    """
    try:
        # Check user settings for voice_mode to determine if we should use online TTS
        # Default to offline if user_id not provided or setting not found
        online_mode = False
        if request.user_id:
            try:
                user_setting = app_context.database.get_user_setting(request.user_id, "voice_mode")
                logger.info(f"User {request.user_id} voice_mode setting: {user_setting.value if user_setting else 'not found'}")
                if user_setting and user_setting.value == "online":
                    online_mode = True
                    logger.info(f"✅ Using online TTS (gTTS) for user {request.user_id} - better quality")
                else:
                    logger.info(f"⚠️ Using offline TTS (pyttsx3) for user {request.user_id} - lower quality")
            except Exception as e:
                logger.warning(f"Could not check voice_mode setting: {e}")
                # Use default offline mode
        else:
            logger.info("No user_id provided, using default offline mode")
        
        # Create SpeechEngine with appropriate mode
        # If online mode, prefer gTTS for better quality
        from src.services.speech_engine import SpeechEngine
        speech_engine = SpeechEngine(online_mode=online_mode)
        
        # Generate audio
        audio_path, is_cached = speech_engine.get_audio_path(
            text=request.text,
            lesson_id=request.lesson_id,
            phrase_id=request.phrase_id,
            audio_filename=None,
            speed=request.speed or 1.0,
        )
        
        if not audio_path:
            raise HTTPException(
                status_code=500,
                detail="Failed to generate audio"
            )
        
        # Convert to relative URL
        rel_path = str(audio_path).replace("\\", "/")
        if rel_path.startswith("./"):
            rel_path = rel_path[2:]
        audio_url = f"/{rel_path}"
        
        return {
            "status": "success",
            "message": "Audio generated successfully" if not is_cached else "Audio retrieved from cache",
            "data": {
                "audio_url": audio_url,
                "cached": is_cached,
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in audio_generate: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@router.post("/clear-cache", status_code=200)
async def audio_clear_cache():
    """Clear all cached audio files.
    
    Returns:
        Success message with count of files cleared
    """
    try:
        from pathlib import Path
        cache_dir = Path("./audio_cache")
        
        if not cache_dir.exists():
            return {
                "status": "success",
                "message": "Audio cache directory does not exist",
                "data": {"files_cleared": 0}
            }
        
        # Count and remove all MP3 files
        files_cleared = 0
        for cache_file in cache_dir.glob("*.mp3"):
            try:
                cache_file.unlink()
                files_cleared += 1
            except Exception as e:
                logger.warning(f"Failed to remove cache file {cache_file}: {e}")
        
        logger.info(f"Cleared {files_cleared} audio cache files")
        
        return {
            "status": "success",
            "message": f"Cleared {files_cleared} cached audio files",
            "data": {"files_cleared": files_cleared}
        }
        
    except Exception as e:
        logger.error(f"Error clearing audio cache: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

