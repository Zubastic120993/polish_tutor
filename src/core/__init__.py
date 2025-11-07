"""Core application components."""
from src.core.app_context import AppContext, app_context
from src.core.database import Base, SessionLocal, engine
from src.core.lesson_manager import LessonManager

__all__ = [
    "AppContext",
    "app_context",
    "Base",
    "SessionLocal",
    "engine",
    "LessonManager",
]

