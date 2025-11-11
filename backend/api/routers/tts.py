"""TTS API router for Murf integration."""
import logging
from typing import Dict, Optional, Any
from fastapi import APIRouter, HTTPException, BackgroundTasks

from backend.tts import MurfClient, AudioCacheManager, get_queue, get_job_status, cancel_job

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tts", tags=["tts"])


@router.post("/speak")
async def speak_text(
    text: str,
    voice_id: str,
    language: str = "pl",
    style: str = "conversational",
    format: str = "mp3",
    speed: float = 1.0,
    background_tasks: BackgroundTasks = None,
) -> Dict[str, Any]:
    """Start asynchronous text-to-speech synthesis.

    Args:
        text: Text to synthesize
        voice_id: Voice ID to use
        language: Language code
        style: Voice style
        format: Audio format
        speed: Playback speed
        background_tasks: FastAPI background tasks

    Returns:
        Job information with ID for status polling
    """
    try:
        # Validate input
        if not text or not text.strip():
            raise HTTPException(status_code=400, detail="Text cannot be empty")

        if not voice_id:
            raise HTTPException(status_code=400, detail="Voice ID is required")

        # Generate cache key for deduplication
        cache_manager = AudioCacheManager()
        cache_key = cache_manager.generate_cache_key(
            text=text,
            voice_id=voice_id,
            provider="murf",
            language=language,
            style=style,
            speed=speed,
            format=format,
        )

        # Check if already cached
        if cache_manager.is_cached(cache_key, format):
            audio_url = cache_manager.get_audio_url(cache_key, format)
            return {
                "status": "completed",
                "message": "Audio already available",
                "data": {
                    "audio_url": audio_url,
                    "cached": True,
                    "cache_key": cache_key,
                }
            }

        # Submit job to queue
        queue = get_queue()
        job = queue.enqueue(
            "backend.tts.tasks.synthesize_speech_task",
            text=text,
            voice_id=voice_id,
            cache_key=cache_key,
            language=language,
            style=style,
            format=format,
            speed=speed,
        )

        logger.info(f"Queued TTS job {job.id} for cache key {cache_key}")

        return {
            "status": "queued",
            "message": "TTS synthesis job queued",
            "data": {
                "job_id": job.id,
                "cache_key": cache_key,
                "estimated_time": "30-60 seconds",
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to queue TTS job: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start TTS synthesis: {str(e)}")


@router.get("/status/{job_id}")
async def get_tts_status(job_id: str) -> Dict[str, Any]:
    """Get the status of a TTS synthesis job.

    Args:
        job_id: Job ID from /tts/speak

    Returns:
        Job status information
    """
    try:
        status = get_job_status(job_id)

        if status is None:
            raise HTTPException(status_code=404, detail="Job not found")

        return {
            "status": "success",
            "message": f"Job status: {status['status']}",
            "data": status
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get job status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get job status: {str(e)}")


@router.delete("/jobs/{job_id}")
async def cancel_tts_job(job_id: str) -> Dict[str, Any]:
    """Cancel a TTS synthesis job.

    Args:
        job_id: Job ID to cancel

    Returns:
        Cancellation result
    """
    try:
        cancelled = cancel_job(job_id)

        if cancelled:
            return {
                "status": "success",
                "message": "Job cancelled successfully",
                "data": {"job_id": job_id}
            }
        else:
            return {
                "status": "error",
                "message": "Job could not be cancelled (may already be completed)",
                "data": {"job_id": job_id}
            }

    except Exception as e:
        logger.error(f"Failed to cancel job: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to cancel job: {str(e)}")


@router.get("/voices")
async def get_available_voices(language: Optional[str] = None) -> Dict[str, Any]:
    """Get available Murf voices.

    Args:
        language: Optional language filter

    Returns:
        Available voices information
    """
    try:
        async with MurfClient() as client:
            voices = await client.get_voices(language=language)

        return {
            "status": "success",
            "message": "Retrieved available voices",
            "data": voices
        }

    except Exception as e:
        logger.error(f"Failed to get voices: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get voices: {str(e)}")


@router.get("/cache/stats")
async def get_cache_stats() -> Dict[str, Any]:
    """Get audio cache statistics.

    Returns:
        Cache statistics
    """
    try:
        cache_manager = AudioCacheManager()
        stats = cache_manager.get_cache_stats()

        return {
            "status": "success",
            "message": "Retrieved cache statistics",
            "data": stats
        }

    except Exception as e:
        logger.error(f"Failed to get cache stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get cache stats: {str(e)}")


@router.post("/cache/cleanup")
async def cleanup_cache() -> Dict[str, Any]:
    """Clean up expired cache entries.

    Returns:
        Cleanup result
    """
    try:
        cache_manager = AudioCacheManager()
        removed_count = cache_manager.cleanup_expired_entries()

        return {
            "status": "success",
            "message": f"Cleaned up {removed_count} expired cache entries",
            "data": {"removed_count": removed_count}
        }

    except Exception as e:
        logger.error(f"Failed to cleanup cache: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to cleanup cache: {str(e)}")


@router.delete("/cache")
async def clear_cache(confirm: bool = False) -> Dict[str, Any]:
    """Clear all cached audio files.

    Args:
        confirm: Must be True to actually clear cache

    Returns:
        Clear result
    """
    try:
        if not confirm:
            raise HTTPException(
                status_code=400,
                detail="Please set confirm=true to clear the entire cache"
            )

        cache_manager = AudioCacheManager()
        removed_count = cache_manager.clear_cache(confirm=True)

        return {
            "status": "success",
            "message": f"Cleared {removed_count} files from cache",
            "data": {"removed_count": removed_count}
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to clear cache: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to clear cache: {str(e)}")
