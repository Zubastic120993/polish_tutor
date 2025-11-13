"""Prometheus metrics instrumentation for FastAPI and RQ monitoring."""

import time
from typing import Callable, Optional
from fastapi import Request, Response
from prometheus_client import (
    Counter,
    Histogram,
    Gauge,
    generate_latest,
    CONTENT_TYPE_LATEST,
)
from starlette.middleware.base import BaseHTTPMiddleware
from src.core.app_context import app_context

# -------------------------------------------------------------------
# Metrics definitions
# -------------------------------------------------------------------

http_requests_total = Counter(
    "http_requests_total",
    "Total number of HTTP requests",
    ["method", "endpoint", "status_code"],
)

http_request_duration_seconds = Histogram(
    "http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "endpoint"],
    buckets=[0.1, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0],
)

http_request_size_bytes = Histogram(
    "http_request_size_bytes",
    "HTTP request size in bytes",
    ["method", "endpoint"],
    buckets=[100, 1000, 10000, 100000, 1000000],
)

http_response_size_bytes = Histogram(
    "http_response_size_bytes",
    "HTTP response size in bytes",
    ["method", "endpoint", "status_code"],
    buckets=[100, 1000, 10000, 100000, 1000000],
)

active_connections = Gauge("app_active_connections", "Number of active connections")

tts_jobs_submitted_total = Counter(
    "tts_jobs_submitted_total", "Total number of TTS jobs submitted", ["priority", "user_id"]
)

tts_jobs_completed_total = Counter("tts_jobs_completed_total", "Total number of TTS jobs completed")

tts_jobs_failed_total = Counter("tts_jobs_failed_total", "Total number of TTS jobs failed", ["error_type"])

tts_job_duration_seconds = Histogram(
    "tts_job_duration_seconds",
    "TTS job processing duration in seconds",
    buckets=[10, 30, 60, 120, 300, 600, 1800],
)

tts_queue_length = Gauge("tts_queue_length", "Current length of TTS queues", ["queue_name"])

tts_active_workers = Gauge("tts_active_workers", "Number of active TTS workers", ["pool_name"])

tts_cache_hits_total = Counter("tts_cache_hits_total", "Total number of TTS cache hits")
tts_cache_misses_total = Counter("tts_cache_misses_total", "Total number of TTS cache misses")
tts_cache_size_bytes = Gauge("tts_cache_size_bytes", "Total size of TTS cache in bytes")

auth_logins_total = Counter("auth_logins_total", "Total authentication attempts", ["result"])
auth_tokens_issued_total = Counter("auth_tokens_issued_total", "Total JWT tokens issued", ["token_type"])


# -------------------------------------------------------------------
# Middleware
# -------------------------------------------------------------------

class MetricsMiddleware(BaseHTTPMiddleware):
    """Middleware to collect HTTP metrics."""

    def __init__(self, app: Callable):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        endpoint = self._get_endpoint_path(request.url.path)

        # record request size
        try:
            request_size = int(request.headers.get("content-length", "0"))
            http_request_size_bytes.labels(method=request.method, endpoint=endpoint).observe(request_size)
        except (ValueError, TypeError):
            pass

        try:
            response = await call_next(request)
            duration = time.time() - start_time

            http_requests_total.labels(
                method=request.method, endpoint=endpoint, status_code=str(response.status_code)
            ).inc()

            http_request_duration_seconds.labels(method=request.method, endpoint=endpoint).observe(duration)

            # record response size
            if response.headers.get("content-length"):
                try:
                    resp_size = int(response.headers["content-length"])
                    http_response_size_bytes.labels(
                        method=request.method, endpoint=endpoint, status_code=str(response.status_code)
                    ).observe(resp_size)
                except (ValueError, TypeError):
                    pass

            return response

        except Exception:
            duration = time.time() - start_time
            http_requests_total.labels(method=request.method, endpoint=endpoint, status_code="500").inc()
            http_request_duration_seconds.labels(method=request.method, endpoint=endpoint).observe(duration)
            raise

    def _get_endpoint_path(self, path: str) -> str:
        parts = path.strip("/").split("/")
        if len(parts) >= 3 and parts[0] == "api" and parts[1] == "tts" and parts[2] == "status":
            return "/api/tts/status/{job_id}"
        return path


# -------------------------------------------------------------------
# Dynamic Metrics
# -------------------------------------------------------------------

def update_queue_metrics() -> None:
    """Update TTS queue metrics."""
    try:
        from backend.tts.queue_manager import get_queue_manager
        queue_manager = get_queue_manager()
        stats = queue_manager.get_queue_stats()

        for qname, qstats in stats.get("queues", {}).items():
            tts_queue_length.labels(queue_name=qname).set(qstats.get("queued", 0))

        workers = stats.get("workers", {})
        active = workers.get("active_count", 0)
        tts_active_workers.labels(pool_name="all").set(active)
    except Exception as e:
        print(f"Failed to update queue metrics: {e}")


def update_cache_metrics() -> None:
    """Update TTS cache metrics."""
    try:
        from backend.tts.audio_cache import AudioCacheManager
        cache = AudioCacheManager()
        stats = cache.get_cache_stats()
        tts_cache_size_bytes.set(stats.get("total_size_bytes", 0))
    except Exception as e:
        print(f"Failed to update cache metrics: {e}")


async def metrics_endpoint() -> Response:
    """Expose Prometheus metrics."""
    update_queue_metrics()
    update_cache_metrics()
    output = generate_latest()
    return Response(content=output, media_type=CONTENT_TYPE_LATEST)


# -------------------------------------------------------------------
# Recorders (✅ type safe)
# -------------------------------------------------------------------

def record_tts_job_submitted(priority: str = "normal", user_id: Optional[str] = None) -> None:
    tts_jobs_submitted_total.labels(priority=priority, user_id=user_id or "anonymous").inc()


def record_tts_job_completed(duration_seconds: Optional[float] = None) -> None:
    tts_jobs_completed_total.inc()
    if duration_seconds is not None:
        tts_job_duration_seconds.observe(duration_seconds)


def record_tts_job_failed(error_type: str = "unknown") -> None:
    tts_jobs_failed_total.labels(error_type=error_type).inc()


def record_auth_login(success: bool) -> None:
    auth_logins_total.labels(result="success" if success else "failure").inc()


def record_auth_token_issued(token_type: str) -> None:
    auth_tokens_issued_total.labels(token_type=token_type).inc()


def record_cache_hit() -> None:
    tts_cache_hits_total.inc()


def record_cache_miss() -> None:
    tts_cache_misses_total.inc()
    