"""Enhanced TTS Queue Manager with monitoring, deduplication, and priority handling."""
import hashlib
import json
import logging
import os
import time
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta

from redis import Redis
from rq import Queue, Retry
from rq.job import Job
from rq.registry import FailedJobRegistry

from backend.tts.audio_cache import AudioCacheManager
from src.core.app_context import app_context

logger = logging.getLogger(__name__)

# Queue names
QUEUE_STANDARD = "tts_jobs"
QUEUE_HIGH_PRIORITY = "tts_high_priority"
QUEUE_BATCH = "tts_batch"
QUEUE_RETRY = "tts_retry"
QUEUE_DEAD_LETTER = "tts_dead_letter"

# Worker pool configurations
WORKER_POOLS = {
    "standard": {
        "queues": [QUEUE_HIGH_PRIORITY, QUEUE_STANDARD],
        "worker_count": int(os.getenv("TTS_STANDARD_WORKERS", "4")),
        "timeout": int(os.getenv("TTS_WORKER_TIMEOUT", "600")),
    },
    "priority": {
        "queues": [QUEUE_HIGH_PRIORITY],
        "worker_count": int(os.getenv("TTS_HIGH_PRIORITY_WORKERS", "2")),
        "timeout": int(os.getenv("TTS_WORKER_TIMEOUT", "300")),
    },
    "batch": {
        "queues": [QUEUE_BATCH],
        "worker_count": int(os.getenv("TTS_BATCH_WORKERS", "1")),
        "timeout": int(os.getenv("TTS_WORKER_TIMEOUT", "1800")),
    },
}


class TTSQueueManager:
    """Enhanced queue manager with monitoring, deduplication, and priority handling."""

    def __init__(self):
        config = app_context.config

        # Redis connections for different purposes
        redis_url = config.get("redis_url", "redis://localhost:6379")
        self.redis_queue = Redis.from_url(redis_url, db=config.get("redis_db_queue", 0))
        self.redis_dedup = Redis.from_url(redis_url, db=config.get("redis_db_dedup", 1))
        self.redis_cache = Redis.from_url(redis_url, db=config.get("redis_db_cache", 2))

        # Initialize queues
        self.queues = {}
        for queue_name in [QUEUE_STANDARD, QUEUE_HIGH_PRIORITY, QUEUE_BATCH, QUEUE_RETRY, QUEUE_DEAD_LETTER]:
            self.queues[queue_name] = Queue(
                queue_name,
                connection=self.redis_queue,
                default_timeout=config.get("tts_worker_timeout", 600)
            )

        # Configuration
        self.config = {
            "max_retries": config.get("tts_max_retries", 3),
            "retry_delay": config.get("tts_retry_delay", 60),
            "job_ttl": config.get("tts_job_ttl", 86400),
            "result_ttl": config.get("tts_job_result_ttl", 604800),
            "dedup_ttl": config.get("tts_dedup_ttl", 3600),
            "rate_limit_per_minute": config.get("tts_rate_limit_per_minute", 10),
        }

        # Audio cache manager
        self.cache_manager = AudioCacheManager()

    def submit_job(
        self,
        text: str,
        voice_id: str,
        priority: str = "normal",
        user_id: Optional[int] = None,
        **kwargs
    ) -> str:
        """Submit TTS job with deduplication, priority handling, and rate limiting.

        Args:
            text: Text to synthesize
            voice_id: Voice ID to use
            priority: Job priority ("high", "normal", "batch")
            user_id: User ID for rate limiting (optional)
            **kwargs: Additional parameters for synthesis

        Returns:
            Job ID
        """
        # Apply rate limiting if user_id provided
        if user_id and not self._check_rate_limit(user_id):
            raise ValueError(f"Rate limit exceeded for user {user_id}")

        # Generate deduplication key
        dedup_key = self._generate_dedup_key(text, voice_id, kwargs)

        # Check for existing cached result
        if self.cache_manager.is_cached(dedup_key, kwargs.get("format", "mp3")):
            logger.info(f"Audio already cached for key: {dedup_key}")
            # Record cache hit (lazy import to avoid circular dependency)
            try:
                from src.core.metrics import record_cache_hit
                record_cache_hit()
            except ImportError:
                pass
            # Return a dummy job ID indicating cached result
            return f"cached_{dedup_key}"

        # Check for existing job
        existing_job_id = self._get_existing_job(dedup_key)
        if existing_job_id:
            logger.info(f"Reusing existing job {existing_job_id} for dedup key: {dedup_key}")
            return existing_job_id

        # Select queue based on priority
        queue = self._get_queue_for_priority(priority)

        # Prepare job arguments
        job_args = {
            "text": text,
            "voice_id": voice_id,
            "cache_key": dedup_key,
            **kwargs
        }

        # Submit job with retry configuration
        retry = Retry(
            max=self.config["max_retries"],
            interval=self.config["retry_delay"]
        )

        job = queue.enqueue(
            "backend.tts.tasks.synthesize_speech_task",
            **job_args,
            job_timeout=self.config["job_ttl"],
            result_ttl=self.config["result_ttl"],
            ttl=self.config["job_ttl"],
            retry=retry
        )

        # Store deduplication mapping
        self._store_dedup_mapping(dedup_key, job.id)

        # Record metrics
        # Record job submission (lazy import to avoid circular dependency)
        try:
            from src.core.metrics import record_tts_job_submitted
            record_tts_job_submitted(priority=priority, user_id=user_id)
        except ImportError:
            pass

        logger.info(f"Submitted TTS job {job.id} to queue {queue.name} with dedup key {dedup_key}")
        return job.id

    def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get comprehensive job status.

        Args:
            job_id: Job ID to check

        Returns:
            Job status information or None if not found
        """
        try:
            # Handle cached jobs
            if job_id.startswith("cached_"):
                cache_key = job_id.replace("cached_", "")
                if self.cache_manager.is_cached(cache_key, "mp3"):  # Default format
                    audio_url = self.cache_manager.get_audio_url(cache_key, "mp3")
                    return {
                        "job_id": job_id,
                        "status": "completed",
                        "audio_url": audio_url,
                        "cached": True,
                        "completed_at": datetime.utcnow().isoformat(),
                    }
                else:
                    return {
                        "job_id": job_id,
                        "status": "failed",
                        "error": "Cached audio not found",
                    }

            # Check all queues for the job
            for queue in self.queues.values():
                try:
                    job = Job.fetch(job_id, connection=queue.connection)

                    if job.is_finished:
                        return {
                            "job_id": job_id,
                            "status": "completed",
                            "result": job.result,
                            "completed_at": job.ended_at.isoformat() if job.ended_at else None,
                            "started_at": job.started_at.isoformat() if job.started_at else None,
                            "duration": (job.ended_at - job.started_at).total_seconds() if job.ended_at and job.started_at else None,
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
                            "queue_position": self._get_queue_position(job_id),
                        }
                except:
                    continue  # Job not in this queue

            return None

        except Exception as e:
            logger.error(f"Failed to get job status for {job_id}: {e}")
            return None

    def cancel_job(self, job_id: str) -> bool:
        """Cancel a running job.

        Args:
            job_id: Job ID to cancel

        Returns:
            True if cancelled successfully
        """
        try:
            # Check all queues
            for queue in self.queues.values():
                try:
                    job = Job.fetch(job_id, connection=queue.connection)
                    if job.is_started and not job.is_finished:
                        job.cancel()
                        logger.info(f"Cancelled TTS job {job_id}")
                        return True
                except:
                    continue

            return False

        except Exception as e:
            logger.error(f"Failed to cancel job {job_id}: {e}")
            return False

    def get_queue_stats(self) -> Dict[str, Any]:
        """Get comprehensive queue statistics.

        Returns:
            Queue statistics
        """
        stats = {
            "queues": {},
            "workers": {},
            "jobs": {
                "total": 0,
                "completed": 0,
                "failed": 0,
                "in_progress": 0,
                "queued": 0
            },
            "timestamp": datetime.utcnow().isoformat()
        }

        # Queue statistics
        for queue_name, queue in self.queues.items():
            queue_stats = {
                "queued": len(queue),
                "deferred": len(queue.deferred_job_registry),
                "failed": len(queue.failed_job_registry),
                "finished": len(queue.finished_job_registry),
            }
            stats["queues"][queue_name] = queue_stats

            # Aggregate job counts
            stats["jobs"]["queued"] += queue_stats["queued"]
            stats["jobs"]["failed"] += queue_stats["failed"]

        # Get worker statistics (simplified)
        stats["workers"] = self._get_worker_stats()

        # Estimate in-progress jobs
        stats["jobs"]["in_progress"] = self._count_in_progress_jobs()

        return stats

    def get_health_status(self) -> Dict[str, Any]:
        """Get system health status.

        Returns:
            Health status information
        """
        health = {
            "status": "healthy",
            "checks": {},
            "timestamp": datetime.utcnow().isoformat()
        }

        # Redis connectivity
        try:
            self.redis_queue.ping()
            health["checks"]["redis_connected"] = True
        except:
            health["checks"]["redis_connected"] = False
            health["status"] = "unhealthy"

        # Queue responsiveness
        health["checks"]["queues_healthy"] = self._check_queues_healthy()

        # Worker health
        worker_stats = self._get_worker_stats()
        health["checks"]["workers_running"] = worker_stats.get("active_count", 0) > 0

        # Error rates
        error_rate = self._calculate_error_rate()
        health["checks"]["error_rate_acceptable"] = error_rate < 0.1  # Less than 10%
        health["error_rate"] = error_rate

        # Queue depth
        queue_depth = sum(len(q) for q in self.queues.values())
        health["checks"]["queue_depth_normal"] = queue_depth < 100
        health["queue_depth"] = queue_depth

        if not all(health["checks"].values()):
            health["status"] = "degraded"

        return health

    def cleanup_failed_jobs(self, max_age_hours: int = 24) -> int:
        """Clean up old failed jobs.

        Args:
            max_age_hours: Maximum age of failed jobs to keep

        Returns:
            Number of jobs cleaned up
        """
        cleaned_count = 0

        try:
            for queue in self.queues.values():
                failed_registry = FailedJobRegistry(queue.name, connection=queue.connection)
                failed_jobs = failed_registry.get_job_ids()

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

        except Exception as e:
            logger.error(f"Failed to cleanup failed jobs: {e}")

        return cleaned_count

    # Private helper methods

    def _generate_dedup_key(self, text: str, voice_id: str, params: Dict[str, Any]) -> str:
        """Generate deterministic deduplication key."""
        key_data = {
            "text": text.strip().lower()[:1000],  # Limit text length for key
            "voice_id": voice_id,
            "params": {k: v for k, v in sorted(params.items()) if k not in ["cache_key"]}
        }
        key_string = json.dumps(key_data, sort_keys=True, default=str)
        return hashlib.sha256(key_string.encode()).hexdigest()

    def _store_dedup_mapping(self, dedup_key: str, job_id: str):
        """Store deduplication mapping with TTL."""
        self.redis_dedup.setex(f"dedup:{dedup_key}", self.config["dedup_ttl"], job_id)

    def _get_existing_job(self, dedup_key: str) -> Optional[str]:
        """Get existing job ID for deduplication key."""
        return self.redis_dedup.get(f"dedup:{dedup_key}")

    def _get_queue_for_priority(self, priority: str) -> Queue:
        """Get appropriate queue for job priority."""
        if priority == "high":
            return self.queues[QUEUE_HIGH_PRIORITY]
        elif priority == "batch":
            return self.queues[QUEUE_BATCH]
        else:
            return self.queues[QUEUE_STANDARD]

    def _get_queue_position(self, job_id: str) -> Optional[int]:
        """Get position of job in queue."""
        for queue in self.queues.values():
            try:
                job_ids = queue.get_job_ids()
                if job_id in job_ids:
                    return job_ids.index(job_id) + 1  # 1-based position
            except:
                continue
        return None

    def _get_worker_stats(self) -> Dict[str, Any]:
        """Get worker statistics (simplified implementation)."""
        # This would need RQ worker registry integration for full stats
        return {
            "active_count": 0,  # Placeholder
            "total_registered": len(WORKER_POOLS),
            "pools": WORKER_POOLS
        }

    def _check_queues_healthy(self) -> bool:
        """Check if queues are responding."""
        try:
            for queue in self.queues.values():
                queue.count  # Simple queue operation
            return True
        except:
            return False

    def _count_in_progress_jobs(self) -> int:
        """Count jobs currently being processed."""
        count = 0
        for queue in self.queues.values():
            try:
                # Check started jobs registry
                started_jobs = queue.started_job_registry.get_job_ids()
                count += len(started_jobs)
            except:
                pass
        return count

    def _calculate_error_rate(self) -> float:
        """Calculate recent error rate."""
        try:
            total_jobs = 0
            failed_jobs = 0

            for queue in self.queues.values():
                failed_registry = FailedJobRegistry(queue.name, connection=queue.connection)
                failed_jobs += len(failed_registry)

                # Estimate total jobs from finished registry
                finished_jobs = len(queue.finished_job_registry)
                total_jobs += finished_jobs + len(queue)  # Current queue + finished

            return failed_jobs / max(total_jobs, 1)

        except Exception as e:
            logger.error(f"Failed to calculate error rate: {e}")
            return 0.0

    def _check_rate_limit(self, user_id: int) -> bool:
        """Check if user is within rate limits.

        Args:
            user_id: User ID to check

        Returns:
            True if within limits, False if rate limited
        """
        try:
            # Use sliding window rate limiting
            window_key = f"ratelimit:{user_id}:{int(time.time() / 60)}"  # Per minute window
            count = self.redis_dedup.incr(window_key)

            # Set expiration on first request in this window
            if count == 1:
                self.redis_dedup.expire(window_key, 60)  # Expire after 1 minute

            # Check against limit
            return count <= self.config["rate_limit_per_minute"]

        except Exception as e:
            logger.warning(f"Rate limit check failed for user {user_id}: {e}")
            # Allow request on error to avoid blocking legitimate users
            return True


# Global queue manager instance
_queue_manager = None

def get_queue_manager() -> TTSQueueManager:
    """Get global queue manager instance."""
    global _queue_manager
    if _queue_manager is None:
        _queue_manager = TTSQueueManager()
    return _queue_manager
