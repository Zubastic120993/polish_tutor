"""FastAPI middleware for request ID generation and structured logging."""
import time
import uuid
from typing import Callable

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from .logging_config import get_logger, set_request_id, get_request_id, generate_correlation_id, set_correlation_id

logger = get_logger(__name__)


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Middleware to generate and propagate request IDs."""

    def __init__(self, app: Callable, header_name: str = "X-Request-ID"):
        super().__init__(app)
        self.header_name = header_name

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process each request with request ID generation."""
        # Generate or extract request ID
        request_id = request.headers.get(self.header_name, str(uuid.uuid4()))

        # Set in thread-local storage
        set_request_id(request_id)

        # Generate correlation ID if not present
        correlation_id = request.headers.get("X-Correlation-ID", generate_correlation_id())
        set_correlation_id(correlation_id)

        # Add request ID to request state for use in handlers
        request.state.request_id = request_id
        request.state.correlation_id = correlation_id

        # Log request start
        logger.info(f"Request started: {request.method} {request.url.path}", extra={
            "method": request.method,
            "path": request.url.path,
            "query_params": str(request.query_params),
            "user_agent": request.headers.get("user-agent"),
            "remote_addr": request.client.host if request.client else None,
            "request_size": request.headers.get("content-length"),
        })

        # Process request
        start_time = time.time()
        response = await call_next(request)
        duration = time.time() - start_time

        # Add request ID and correlation ID to response headers
        response.headers[self.header_name] = request_id
        response.headers["X-Correlation-ID"] = correlation_id

        # Log request completion
        logger.info(f"Request completed: {request.method} {request.url.path}", extra={
            "status_code": response.status_code,
            "duration_ms": round(duration * 1000, 2),
            "response_size": response.headers.get("content-length"),
        })

        return response


class StructuredLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for structured logging of requests and responses."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Log structured information about requests and responses."""
        start_time = time.time()

        # Extract request details
        request_details = {
            "method": request.method,
            "path": request.url.path,
            "query_params": dict(request.query_params),
            "headers": dict(request.headers),
            "client_ip": request.client.host if request.client else None,
            "user_agent": request.headers.get("user-agent"),
        }

        try:
            response = await call_next(request)
            duration = time.time() - start_time

            # Log successful request
            logger.info("HTTP Request", extra={
                "http_method": request.method,
                "http_path": request.url.path,
                "http_status": response.status_code,
                "http_duration_ms": round(duration * 1000, 2),
                "http_response_size": response.headers.get("content-length"),
                "http_request_size": request.headers.get("content-length"),
                "user_agent": request.headers.get("user-agent"),
                "client_ip": request.client.host if request.client else None,
            })

            return response

        except Exception as exc:
            duration = time.time() - start_time

            # Log error request
            logger.error("HTTP Request Error", extra={
                "http_method": request.method,
                "http_path": request.url.path,
                "http_duration_ms": round(duration * 1000, 2),
                "error_type": type(exc).__name__,
                "error_message": str(exc),
                "client_ip": request.client.host if request.client else None,
            }, exc_info=True)

            # Return error response
            return JSONResponse(
                status_code=500,
                content={
                    "status": "error",
                    "message": "Internal server error",
                    "request_id": get_request_id(),
                }
            )


class ExceptionLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log unhandled exceptions with full context."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Catch and log any unhandled exceptions."""
        try:
            return await call_next(request)
        except Exception as exc:
            # Log the exception with full context
            logger.error("Unhandled exception in request", extra={
                "http_method": request.method,
                "http_path": request.url.path,
                "http_query": str(request.query_params),
                "client_ip": request.client.host if request.client else None,
                "user_agent": request.headers.get("user-agent"),
                "exception_type": type(exc).__name__,
                "exception_message": str(exc),
            }, exc_info=True)

            # Re-raise to let FastAPI's exception handlers deal with it
            raise
