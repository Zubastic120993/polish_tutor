"""TTS job queue tasks using RQ (Redis Queue)."""
import logging
from typing import Dict, Optional, Any
import os
from pathlib import Path

from redis import Redis
from rq import Queue, get_current_job
from rq.job import Job

from .murf_client import MurfClient
from .audio_cache import AudioCacheManager

logger = logging.getLogger(__name__)


def get_queue(connection: Optional[Redis] = None) -> Queue:
    """Get the TTS job queue.

    Args:
        connection: Redis connection (optional)

    Returns:
        RQ Queue instance
    """
    if connection is None:
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        connection = Redis.from_url(redis_url)

    return Queue("tts_jobs", connection=connection)


def synthesize_speech_task(
    text: str,
    voice_id: str,
    cache_key: str,
    language: str = "pl",
    style: str = "conversational",
    format: str = "mp3",
    **kwargs
) -> Dict[str, Any]:
    """RQ task to synthesize speech using Murf API.

    Args:
        text: Text to synthesize
        voice_id: Murf voice ID
        cache_key: Cache key for deduplication
        language: Language code
        style: Voice style
        format: Audio format
        **kwargs: Additional parameters

    Returns:
        Task result dictionary
    """
    job = get_current_job()

    try:
        # Initialize clients
        murf_client = MurfClient()
        cache_manager = AudioCacheManager()

        # Check if already cached
        if cache_manager.is_cached(cache_key, format):
            logger.info(f"Audio already cached for key: {cache_key}")
            audio_url = cache_manager.get_audio_url(cache_key, format)
            return {
                "status": "completed",
                "cache_key": cache_key,
                "audio_url": audio_url,
                "cached": True,
                "job_id": job.id,
            }

        # Update job progress
        job.meta["progress"] = "submitting_to_murf"
        job.save_meta()

        # Submit synthesis job to Murf
        synthesis_result = murf_client.synthesize_speech(
            text=text,
            voice_id=voice_id,
            language=language,
            style=style,
            format=format,
            **kwargs
        )

        murf_job_id = synthesis_result["job_id"]
        job.meta["murf_job_id"] = murf_job_id
        job.meta["progress"] = "waiting_for_murf"
        job.save_meta()

        logger.info(f"Submitted Murf job {murf_job_id} for cache key {cache_key}")

        # Wait for completion
        final_status = murf_client.wait_for_completion(
            murf_job_id,
            poll_interval=2.0,
            max_wait_time=300.0  # 5 minutes
        )

        job.meta["progress"] = "downloading_audio"
        job.save_meta()

        # Download audio
        cache_path = cache_manager.get_cache_path(cache_key, format)
        downloaded_path = murf_client.download_audio(murf_job_id, cache_path)

        # Store in cache with metadata
        with open(downloaded_path, "rb") as f:
            audio_data = f.read()

        metadata = {
            "provider": "murf",
            "voice_id": voice_id,
            "language": language,
            "style": style,
            "format": format,
            "murf_job_id": murf_job_id,
            "text_length": len(text),
            **kwargs
        }

        cache_manager.store_audio(audio_data, cache_key, format, metadata)

        audio_url = cache_manager.get_audio_url(cache_key, format)

        job.meta["progress"] = "completed"
        job.save_meta()

        logger.info(f"Successfully synthesized and cached audio for key: {cache_key}")

        return {
            "status": "completed",
            "cache_key": cache_key,
            "audio_url": audio_url,
            "cached": False,
            "job_id": job.id,
            "murf_job_id": murf_job_id,
            "file_size": len(audio_data),
        }

    except Exception as e:
        logger.error(f"TTS synthesis failed for cache key {cache_key}: {e}")
        job.meta["error"] = str(e)
        job.meta["progress"] = "failed"
        job.save_meta()

        raise  # Re-raise to mark job as failed

    finally:
        # Cleanup
        try:
            murf_client.close()
        except:
            pass


def get_job_status(job_id: str) -> Optional[Dict[str, Any]]:
    """Get the status of a TTS job.

    Args:
        job_id: RQ job ID

    Returns:
        Job status information or None if not found
    """
    try:
        job = Job.fetch(job_id, connection=get_queue().connection)

        if job.is_finished:
            return {
                "job_id": job_id,
                "status": "completed",
                "result": job.result,
                "completed_at": job.ended_at.isoformat() if job.ended_at else None,
            }
        elif job.is_failed:
            return {
                "job_id": job_id,
                "status": "failed",
                "error": str(job.exc_info) if job.exc_info else "Unknown error",
                "failed_at": job.ended_at.isoformat() if job.ended_at else None,
            }
        else:
            return {
                "job_id": job_id,
                "status": "in_progress",
                "progress": job.meta.get("progress", "unknown"),
                "murf_job_id": job.meta.get("murf_job_id"),
                "started_at": job.started_at.isoformat() if job.started_at else None,
            }

    except Exception as e:
        logger.error(f"Failed to get job status for {job_id}: {e}")
        return None


def cancel_job(job_id: str) -> bool:
    """Cancel a TTS job.

    Args:
        job_id: RQ job ID

    Returns:
        True if cancelled successfully
    """
    try:
        job = Job.fetch(job_id, connection=get_queue().connection)
        if job.is_started and not job.is_finished:
            job.cancel()
            logger.info(f"Cancelled TTS job {job_id}")
            return True
        return False
    except Exception as e:
        logger.error(f"Failed to cancel job {job_id}: {e}")
        return False


def cleanup_failed_jobs(max_age_hours: int = 24) -> int:
    """Clean up old failed jobs.

    Args:
        max_age_hours: Maximum age of failed jobs to keep

    Returns:
        Number of jobs cleaned up
    """
    try:
        queue = get_queue()
        failed_jobs = queue.failed_job_registry.get_job_ids()

        cleaned_count = 0
        for job_id in failed_jobs:
            try:
                job = Job.fetch(job_id, connection=queue.connection)
                if job.ended_at:
                    age_hours = (datetime.utcnow() - job.ended_at).total_seconds() / 3600
                    if age_hours > max_age_hours:
                        job.delete()
                        cleaned_count += 1
            except:
                # Job might already be gone
                pass

        if cleaned_count > 0:
            logger.info(f"Cleaned up {cleaned_count} failed TTS jobs")

        return cleaned_count

    except Exception as e:
        logger.error(f"Failed to cleanup failed jobs: {e}")
        return 0


# Import datetime for cleanup function
from datetime import datetime
