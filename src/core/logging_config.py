"""Structured logging configuration with JSON output and correlation IDs."""
import json
import logging
import os
import sys
import threading
from datetime import datetime
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Dict, Any, Optional


class StructuredJSONFormatter(logging.Formatter):
    """JSON formatter for structured logging."""

    def __init__(self, include_extra: bool = True):
        super().__init__()
        self.include_extra = include_extra

    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON."""
        # Base log entry
        log_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
            "process": record.process,
            "thread": record.thread,
            "thread_name": record.threadName,
        }

        # Add correlation ID if available
        correlation_id = getattr(record, 'correlation_id', None)
        if correlation_id:
            log_entry["correlation_id"] = correlation_id

        # Add user ID if available
        user_id = getattr(record, 'user_id', None)
        if user_id:
            log_entry["user_id"] = user_id

        # Add request ID if available
        request_id = getattr(record, 'request_id', None)
        if request_id:
            log_entry["request_id"] = request_id

        # Add job ID for RQ workers
        job_id = getattr(record, 'job_id', None)
        if job_id:
            log_entry["job_id"] = job_id

        # Add extra fields if requested
        if self.include_extra and hasattr(record, '__dict__'):
            for key, value in record.__dict__.items():
                if key not in {
                    'name', 'msg', 'args', 'levelname', 'levelno', 'pathname',
                    'filename', 'module', 'exc_info', 'exc_text', 'stack_info',
                    'lineno', 'funcName', 'created', 'msecs', 'relativeCreated',
                    'thread', 'threadName', 'processName', 'process', 'message',
                    'correlation_id', 'user_id', 'request_id', 'job_id'
                }:
                    log_entry[f"extra_{key}"] = value

        # Add exception info if present
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_entry, default=str, separators=(',', ':'))


class ContextAdapter(logging.LoggerAdapter):
    """Logger adapter that adds context information to log records."""

    def __init__(self, logger: logging.Logger, context: Dict[str, Any]):
        super().__init__(logger, context)

    def process(self, msg: str, kwargs: Any) -> tuple:
        """Process the logging record to add context."""
        # Add context to the record
        extra = kwargs.get('extra', {})
        extra.update(self.extra)
        kwargs['extra'] = extra
        return msg, kwargs


# Thread-local storage for correlation IDs
_local = threading.local()


def get_correlation_id() -> Optional[str]:
    """Get the current correlation ID from thread-local storage."""
    return getattr(_local, 'correlation_id', None)


def set_correlation_id(correlation_id: str) -> None:
    """Set the correlation ID in thread-local storage."""
    _local.correlation_id = correlation_id


def generate_correlation_id() -> str:
    """Generate a new correlation ID."""
    import uuid
    return str(uuid.uuid4())


def get_request_id() -> Optional[str]:
    """Get the current request ID from thread-local storage."""
    return getattr(_local, 'request_id', None)


def set_request_id(request_id: str) -> None:
    """Set the request ID in thread-local storage."""
    _local.request_id = request_id


def get_logger(name: str) -> ContextAdapter:
    """Get a logger with context adapter."""
    logger = logging.getLogger(name)

    # Create context with current correlation/request IDs
    context = {}
    correlation_id = get_correlation_id()
    if correlation_id:
        context['correlation_id'] = correlation_id

    request_id = get_request_id()
    if request_id:
        context['request_id'] = request_id

    return ContextAdapter(logger, context)


def setup_structured_logging(
    log_dir: str = "./logs",
    log_level: str = "INFO",
    json_output: bool = True,
    console_output: bool = True
) -> None:
    """Set up structured logging with JSON output and correlation IDs.

    Args:
        log_dir: Directory for log files
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        json_output: Whether to use JSON formatting for file output
        console_output: Whether to enable console output for development
    """
    # Create logs directory if it doesn't exist
    Path(log_dir).mkdir(parents=True, exist_ok=True)

    # Configure root logger
    logger = logging.getLogger()
    logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))

    # Remove existing handlers
    logger.handlers.clear()

    # Create rotating file handler
    log_file = os.path.join(log_dir, "app.log")
    file_handler = RotatingFileHandler(
        log_file,
        maxBytes=10_000_000,  # 10MB
        backupCount=10
    )
    file_handler.setLevel(getattr(logging, log_level.upper(), logging.INFO))

    # Use JSON formatter for structured logging
    if json_output:
        file_handler.setFormatter(StructuredJSONFormatter())
    else:
        # Fallback to traditional formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(correlation_id)s - %(request_id)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        file_handler.setFormatter(formatter)

    # Add file handler
    logger.addHandler(file_handler)

    # Create console handler for development
    if console_output:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.INFO)

        if json_output:
            # Use compact JSON for console (readable)
            console_formatter = StructuredJSONFormatter()
        else:
            console_formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(correlation_id)s - %(request_id)s - %(message)s',
                datefmt='%Y-%m-%d %H:%M:%S'
            )

        console_handler.setFormatter(console_formatter)
        logger.addHandler(console_handler)

    # Log the setup completion
    logger.info("Structured logging configured successfully", extra={
        "json_output": json_output,
        "console_output": console_output,
        "log_level": log_level,
        "log_dir": log_dir
    })


# Backward compatibility
def setup_logging(log_dir: str = "./logs", log_level: str = "INFO") -> None:
    """Legacy setup_logging function for backward compatibility."""
    setup_structured_logging(log_dir, log_level, json_output=False)

