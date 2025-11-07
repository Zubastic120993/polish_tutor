"""Logging configuration."""
import logging
import os
from logging.handlers import RotatingFileHandler
from pathlib import Path


def setup_logging(log_dir: str = "./logs", log_level: str = "INFO") -> None:
    """Set up logging with RotatingFileHandler.
    
    Args:
        log_dir: Directory for log files
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
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
        maxBytes=1_000_000,  # 1MB
        backupCount=7
    )
    file_handler.setLevel(getattr(logging, log_level.upper(), logging.INFO))
    
    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    file_handler.setFormatter(formatter)
    
    # Create console handler for development
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    
    # Add handlers to logger
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    
    logging.info("Logging configured successfully")

