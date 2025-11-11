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

        # Add contextual IDs if present
        for attr in ("correlation_id", "user_id", "request_id", "job_id"):
            value = getattr(record, attr, None)
            if value:
                log_entry[attr] = value

        # Add extra fields
        if self.include_extra and hasattr(record, "__dict__"):
            for key, value in record.__dict__.items():
                if key not in {
                    "name", "msg", "args", "levelname", "levelno", "pathname",
                    "filename", "module", "exc_info", "exc_text", "stack_info",
                    "lineno", "funcName", "created", "msecs", "relativeCreated",
                    "thread", "threadName", "processName", "process", "message",
                    "correlation_id", "user_id", "request_id", "job_id"
                }:
                    log_entry[f"extra_{key}"] = value

        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_entry, default=str, separators=(",", ":"))


class ContextAdapter(logging.LoggerAdapter):
    """Logger adapter that adds context information to log records."""

    def process(self, msg: str, kwargs: Any) -> tuple:
        extra = kwargs.get("extra", {})
        extra.update(self.extra)
        kwargs["extra"] = extra
        return msg, kwargs


# Thread-local storage for correlation/request IDs
_local = threading.local()


def get_correlation_id() -> Optional[str]:
    return getattr(_local, "correlation_id", None)


def set_correlation_id(correlation_id: str) -> None:
    _local.correlation_id = correlation_id


def generate_correlation_id() -> str:
    import uuid
    return str(uuid.uuid4())


def get_request_id() -> Optional[str]:
    return getattr(_local, "request_id", None)


def set_request_id(request_id: str) -> None:
    _local.request_id = request_id


def get_logger(name: str) -> ContextAdapter:
    """Get a logger wrapped with context adapter."""
    logger = logging.getLogger(name)
    context = {}
    if get_correlation_id():
        context["correlation_id"] = get_correlation_id()
    if get_request_id():
        context["request_id"] = get_request_id()
    return ContextAdapter(logger, context)


def setup_structured_logging(
    log_dir: str = "./logs",
    log_level: str = "INFO",
    json_output: bool = True,
    console_output: bool = True
) -> None:
    """Set up structured logging with JSON output and correlation IDs."""
    disable_file_logs = os.environ.get("DISABLE_FILE_LOGS", "").lower() in {"1", "true", "yes", "on"}

    logger = logging.getLogger()
    logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))
    logger.handlers.clear()

    file_handler_configured = False
    if not disable_file_logs:
        try:
            Path(log_dir).mkdir(parents=True, exist_ok=True)
            log_file = os.path.join(log_dir, "app.log")
            file_handler = RotatingFileHandler(log_file, maxBytes=10_000_000, backupCount=10)
            file_handler.setLevel(getattr(logging, log_level.upper(), logging.INFO))

            if json_output:
                file_handler.setFormatter(StructuredJSONFormatter())
            else:
                file_handler.setFormatter(logging.Formatter(
                    "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                    datefmt="%Y-%m-%d %H:%M:%S"
                ))
            logger.addHandler(file_handler)
            file_handler_configured = True
        except PermissionError:
            logger.warning(
                "File logging disabled due to insufficient permissions",
                extra={"ctx_log_dir": log_dir}
            )
            disable_file_logs = True

    # Console output
    if console_output or not file_handler_configured:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.INFO)
        if json_output:
            console_handler.setFormatter(StructuredJSONFormatter())
        else:
            console_handler.setFormatter(logging.Formatter(
                "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                datefmt="%Y-%m-%d %H:%M:%S"
            ))
        logger.addHandler(console_handler)

    # ✅ FIXED SECTION — safe info log (no invalid `extra` keys)
    logger.info(
        "Structured logging configured successfully "
        f"(json_output={json_output}, console_output={console_output or not file_handler_configured}, "
        f"log_level={log_level}, log_dir={log_dir}, file_logging_enabled={file_handler_configured})"
    )


def setup_logging(log_dir: str = "./logs", log_level: str = "INFO") -> None:
    """Legacy setup_logging function."""
    setup_structured_logging(log_dir, log_level, json_output=False)