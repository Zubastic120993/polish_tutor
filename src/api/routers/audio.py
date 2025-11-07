"""Audio API endpoints."""
import logging
from fastapi import APIRouter, HTTPException

from src.api.schemas import AudioGenerateRequest, AudioGenerateResponse
from src.core.app_context import app_context

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/audio", tags=["audio"])


@router.post("/generate", response_model=AudioGenerateResponse, status_code=200)
async def audio_generate(request: AudioGenerateRequest):
    """Optional dynamic TTS generation (caches if new).
    
    Args:
        request: Audio generation request with text, lesson_id, phrase_id, speed
        
    Returns:
        Audio URL
    """
    try:
        speech_engine = app_context.tutor.speech_engine
        
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

