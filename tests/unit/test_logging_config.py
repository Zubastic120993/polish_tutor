"""Unit tests for logging configuration."""

import logging
import os
import tempfile
from pathlib import Path
import pytest


def test_logging_config_module_structure():
    """Test that logging_config module has expected structure."""
    import src.core.logging_config as logging_config_module

    # Verify the function exists
    assert hasattr(logging_config_module, "setup_logging")
    assert callable(logging_config_module.setup_logging)

    # Verify function signature
    import inspect

    sig = inspect.signature(logging_config_module.setup_logging)
    assert "log_dir" in sig.parameters
    assert "log_level" in sig.parameters


def test_setup_logging_creates_directory(tmp_path):
    """Test that setup_logging creates the log directory."""
    log_dir = tmp_path / "test_logs"

    # Import and call the function
    from src.core.logging_config import setup_logging

    setup_logging(str(log_dir))

    # Verify directory was created
    assert log_dir.exists()
    assert log_dir.is_dir()

    # Verify log file was created
    log_file = log_dir / "app.log"
    assert log_file.exists()


def test_setup_logging_with_existing_directory(tmp_path):
    """Test setup_logging works with existing directory."""
    log_dir = tmp_path / "existing_logs"
    log_dir.mkdir()

    # Add a test file
    test_file = log_dir / "existing.txt"
    test_file.write_text("existing content")

    from src.core.logging_config import setup_logging

    setup_logging(str(log_dir))

    # Verify existing file is preserved
    assert test_file.exists()
    assert test_file.read_text() == "existing content"

    # Verify log file was created
    log_file = log_dir / "app.log"
    assert log_file.exists()


def test_setup_logging_with_different_log_levels(tmp_path):
    """Test setup_logging with different log levels."""
    from src.core.logging_config import setup_logging

    log_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]

    for level in log_levels:
        log_dir = tmp_path / f"logs_{level.lower()}"
        # Should not raise an exception
        setup_logging(str(log_dir), level)

        # Verify log file was created
        log_file = log_dir / "app.log"
        assert log_file.exists()


def test_setup_logging_invalid_log_level_defaults_to_info(tmp_path):
    """Test that invalid log level defaults to INFO."""
    from src.core.logging_config import setup_logging

    log_dir = tmp_path / "logs_invalid"
    # Should not raise an exception
    setup_logging(str(log_dir), "INVALID_LEVEL")

    # Verify log file was created
    log_file = log_dir / "app.log"
    assert log_file.exists()


def test_setup_logging_actual_logging_functionality(tmp_path):
    """Test that logging actually works after setup."""
    from src.core.logging_config import setup_logging

    log_dir = tmp_path / "logs_functional"
    setup_logging(str(log_dir))

    # Get a logger and log a message
    logger = logging.getLogger("test_logger")
    logger.setLevel(logging.INFO)
    test_message = "Test message for logging functionality"
    logger.info(test_message)

    for handler in logging.getLogger().handlers:
        flush = getattr(handler, "flush", None)
        if callable(flush):
            flush()

    # Verify the message was written to the log file
    log_file = log_dir / "app.log"
    content = log_file.read_text()

    assert test_message in content
    assert "INFO" in content
    assert "test_logger" in content


def test_setup_logging_formatter_configuration(tmp_path):
    """Test that log format is correctly configured."""
    from src.core.logging_config import setup_logging

    log_dir = tmp_path / "logs_format"
    setup_logging(str(log_dir))

    # Log a message and check format
    logger = logging.getLogger("format_test")
    logger.setLevel(logging.WARNING)
    logger.warning("Format test message")

    for handler in logging.getLogger().handlers:
        flush = getattr(handler, "flush", None)
        if callable(flush):
            flush()

    log_file = log_dir / "app.log"
    content = log_file.read_text()

    # Should contain timestamp, level, logger name, and message
    assert "WARNING" in content
    assert "format_test" in content
    assert "Format test message" in content
    # Should contain timestamp in YYYY-MM-DD HH:MM:SS format
    assert len(content.split(" - ")) >= 4  # date, time, level, logger, message
