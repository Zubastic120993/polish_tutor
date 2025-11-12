"""TTS job queue tasks using RQ (Redis Queue)."""

import logging
import time
import os
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional, Any

from redis import Redis
from rq import Queue, get_current_job
from rq.job import Job

from .murf_client import MurfClient
from .audio_cache import AudioCacheManager
from src.core.logging_config import get_logger, set_request_id, set_correlation_id

logger = get_logger(__name__)


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
    request_id: Optional[str] = None,
    correlation_id: Optional[str] = None,
    **kwargs,
) -> Dict[str, Any]:
    """RQ task to synthesize speech using Murf API."""
    job = get_current_job()

    # Set up logging context
    if request_id:
        set_request_id(request_id)
    if correlation_id:
        set_correlation_id(correlation_id)

    # Create job-specific logger with job ID context
    job_logger = get_logger(__name__)
    job_logger.extra.update({"job_id": job.id})

    job_start_time = time.time()

    try:
        job_logger.info(
            "Starting TTS synthesis task",
            extra={
                "cache_key": cache_key,
                "text_length": len(text),
                "voice_id": voice_id,
                "language": language,
                "format": format,
            },
        )

        # Initialize clients
        murf_client = MurfClient()
        cache_manager = AudioCacheManager()

        # Check cache
        if cache_manager.is_cached(cache_key, format):
            job_logger.info(
                "Audio already cached, returning existing result",
                extra={"cache_key": cache_key, "format": format},
            )
            audio_url = cache_manager.get_audio_url(cache_key, format)
            return {
                "status": "completed",
                "cache_key": cache_key,
                "audio_url": audio_url,
                "cached": True,
                "job_id": job.id,
            }

        # Submit to Murf
        job.meta["progress"] = "submitting_to_murf"
        job.save_meta()
        job_logger.info(
            "Submitting synthesis job to Murf API",
            extra={
                "cache_key": cache_key,
                "text_preview": text[:100] + "..." if len(text) > 100 else text,
            },
        )

        synthesis_result = murf_client.synthesize_speech(
            text=text,
            voice_id=voice_id,
            language=language,
            style=style,
            format=format,
            **kwargs,
        )

        murf_job_id = synthesis_result["job_id"]
        job.meta["murf_job_id"] = murf_job_id
        job.meta["progress"] = "waiting_for_murf"
        job.save_meta()

        job_logger.info(
            "Murf job submitted successfully",
            extra={"murf_job_id": murf_job_id, "cache_key": cache_key},
        )

        # Wait for completion
        job_logger.info(
            "Waiting for Murf job completion",
            extra={"murf_job_id": murf_job_id, "max_wait_time": 300},
        )

        final_status = murf_client.wait_for_completion(
            murf_job_id, poll_interval=2.0, max_wait_time=300.0
        )

        job.meta["progress"] = "downloading_audio"
        job.save_meta()
        job_logger.info(
            "Murf job completed, downloading audio",
            extra={"murf_job_id": murf_job_id, "cache_key": cache_key},
        )

        # ✅ FIXED SECTION — handle async download correctly
        cache_path = cache_manager.get_cache_path(cache_key, format)
        downloaded_path = murf_client.download_audio(murf_job_id, cache_path)

        # If async coroutine, run it
        if asyncio.iscoroutine(downloaded_path):
            downloaded_path = asyncio.run(downloaded_path)

        downloaded_path = Path(downloaded_path)

        # Store in cache
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
            **kwargs,
        }

        cache_manager.store_audio(audio_data, cache_key, format, metadata)
        audio_url = cache_manager.get_audio_url(cache_key, format)

        job.meta["progress"] = "completed"
        job.save_meta()

        job_duration = time.time() - job_start_time
        job_logger.info(
            "TTS synthesis completed successfully",
            extra={
                "cache_key": cache_key,
                "audio_url": audio_url,
                "file_size": len(audio_data),
                "murf_job_id": murf_job_id,
                "duration_seconds": round(job_duration, 2),
            },
        )

        try:
            from src.core.metrics import record_tts_job_completed

            record_tts_job_completed(duration_seconds=job_duration)
        except ImportError:
            pass

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
        job_duration = time.time() - job_start_time
        job_logger.error(
            "TTS synthesis failed",
            extra={
                "cache_key": cache_key,
                "error_type": type(e).__name__,
                "error_message": str(e),
                "duration_seconds": round(job_duration, 2),
            },
            exc_info=True,
        )

        try:
            from src.core.metrics import record_tts_job_failed

            record_tts_job_failed(error_type=type(e).__name__)
        except ImportError:
            pass

        job.meta["error"] = str(e)
        job.meta["progress"] = "failed"
        job.save_meta()
        raise

    finally:
        try:
            murf_client.close()
        except Exception:
            pass


def get_job_status(job_id: str) -> Optional[Dict[str, Any]]:
    """Get the status of a TTS job."""
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
    """Cancel a TTS job."""
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
    """Clean up old failed jobs."""
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
            except Exception:
                pass

        if cleaned_count > 0:
            logger.info(f"Cleaned up {cleaned_count} failed TTS jobs")

        return cleaned_count

    except Exception as e:
        logger.error(f"Failed to cleanup failed jobs: {e}")
        return 0