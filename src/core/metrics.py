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


# HTTP Request Metrics
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

# Application Metrics
active_connections = Gauge("app_active_connections", "Number of active connections")

# TTS Queue Metrics
tts_jobs_submitted_total = Counter(
    "tts_jobs_submitted_total",
    "Total number of TTS jobs submitted",
    ["priority", "user_id"],
)

tts_jobs_completed_total = Counter(
    "tts_jobs_completed_total", "Total number of TTS jobs completed successfully"
)

tts_jobs_failed_total = Counter(
    "tts_jobs_failed_total", "Total number of TTS jobs that failed", ["error_type"]
)

tts_job_duration_seconds = Histogram(
    "tts_job_duration_seconds",
    "TTS job processing duration in seconds",
    buckets=[10, 30, 60, 120, 300, 600, 1800],
)

tts_queue_length = Gauge(
    "tts_queue_length", "Current length of TTS queues", ["queue_name"]
)

tts_active_workers = Gauge(
    "tts_active_workers", "Number of active TTS workers", ["pool_name"]
)

# Cache Metrics
tts_cache_hits_total = Counter("tts_cache_hits_total", "Total number of TTS cache hits")

tts_cache_misses_total = Counter(
    "tts_cache_misses_total", "Total number of TTS cache misses"
)

tts_cache_size_bytes = Gauge("tts_cache_size_bytes", "Total size of TTS cache in bytes")

# Authentication Metrics
auth_logins_total = Counter(
    "auth_logins_total",
    "Total number of authentication attempts",
    ["result"],  # 'success', 'failure'
)

auth_tokens_issued_total = Counter(
    "auth_tokens_issued_total",
    "Total number of JWT tokens issued",
    ["token_type"],  # 'access', 'refresh'
)


class MetricsMiddleware(BaseHTTPMiddleware):
    """Middleware to collect HTTP metrics."""

    def __init__(self, app: Callable):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Collect metrics for each HTTP request."""
        start_time = time.time()

        endpoint = self._get_endpoint_path(request.url.path)

        # Record request size
        content_length = request.headers.get("content-length", "0")
        try:
            request_size = int(content_length)
            http_request_size_bytes.labels(
                method=request.method, endpoint=endpoint
            ).observe(request_size)
        except (ValueError, TypeError):
            pass

        try:
            response = await call_next(request)
            duration = time.time() - start_time

            # Record metrics
            http_requests_total.labels(
                method=request.method,
                endpoint=endpoint,
                status_code=str(response.status_code),
            ).inc()

            http_request_duration_seconds.labels(
                method=request.method, endpoint=endpoint
            ).observe(duration)

            # Record response size
            response_content_length = response.headers.get("content-length")
            if response_content_length:
                try:
                    response_size = int(response_content_length)
                    http_response_size_bytes.labels(
                        method=request.method,
                        endpoint=endpoint,
                        status_code=str(response.status_code),
                    ).observe(response_size)
                except (ValueError, TypeError):
                    pass

            return response

        except Exception:
            duration = time.time() - start_time
            http_requests_total.labels(
                method=request.method, endpoint=endpoint, status_code="500"
            ).inc()

            http_request_duration_seconds.labels(
                method=request.method, endpoint=endpoint
            ).observe(duration)
            raise

    def _get_endpoint_path(self, path: str) -> str:
        """Convert actual path to endpoint pattern for metrics."""
        parts = path.strip("/").split("/")

        if len(parts) >= 2 and parts[0] == "api":
            if len(parts) == 4 and parts[1] == "tts" and parts[2] == "status":
                return "/api/tts/status/{job_id}"
            elif len(parts) == 4 and parts[1] == "user":
                return "/api/user/{user_id}"

        return path


def update_queue_metrics() -> None:
    """Update TTS queue metrics from current queue state."""
    try:
        from backend.tts.queue_manager import get_queue_manager  # type: ignore

        queue_manager = get_queue_manager()
        stats = queue_manager.get_queue_stats()

        for queue_name, queue_stats in stats.get("queues", {}).items():
            tts_queue_length.labels(queue_name=queue_name).set(queue_stats["queued"])

        workers = stats.get("workers", {})
        active_count = workers.get("active_count", 0)
        tts_active_workers.labels(pool_name="all").set(active_count)

    except Exception as e:
        print(f"Failed to update queue metrics: {e}")


def update_cache_metrics() -> None:
    """Update TTS cache metrics."""
    try:
        from backend.tts.audio_cache import AudioCacheManager  # type: ignore

        cache_manager = AudioCacheManager()
        stats = cache_manager.get_cache_stats()

        tts_cache_size_bytes.set(stats.get("total_size_bytes", 0))

    except Exception as e:
        print(f"Failed to update cache metrics: {e}")


async def metrics_endpoint() -> Response:
    """Prometheus metrics endpoint."""
    update_queue_metrics()
    update_cache_metrics()
    output = generate_latest()
    return Response(content=output, media_type=CONTENT_TYPE_LATEST)


# --------------------------------------------------------------------------
# Metrics recording functions (corrected type hints)
# --------------------------------------------------------------------------


def record_tts_job_submitted(
    priority: str = "normal", user_id: Optional[str] = None
) -> None:
    """Record a TTS job submission."""
    tts_jobs_submitted_total.labels(
        priority=priority, user_id=user_id or "anonymous"
    ).inc()


def record_tts_job_completed(duration_seconds: Optional[float] = None) -> None:
    """Record a TTS job completion."""
    tts_jobs_completed_total.inc()
    if duration_seconds is not None:
        tts_job_duration_seconds.observe(duration_seconds)


def record_tts_job_failed(error_type: str = "unknown") -> None:
    """Record a TTS job failure."""
    tts_jobs_failed_total.labels(error_type=error_type).inc()


def record_auth_login(success: bool) -> None:
    """Record an authentication attempt."""
    result = "success" if success else "failure"
    auth_logins_total.labels(result=result).inc()


def record_auth_token_issued(token_type: str) -> None:
    """Record JWT token issuance."""
    auth_tokens_issued_total.labels(token_type=token_type).inc()


def record_cache_hit() -> None:
    """Record a cache hit."""
    tts_cache_hits_total.inc()


def record_cache_miss() -> None:
    """Record a cache miss."""
    tts_cache_misses_total.inc()
