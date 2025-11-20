"""Database ORM models with lazy imports to avoid circular dependencies."""

from importlib import import_module

__all__ = [
    "User",
    "Lesson",
    "Phrase",
    "LessonProgress",
    "Attempt",
    "SRSMemory",
    "Setting",
    "Meta",
    "UserSession",
    "Badge",
    "UserBadge",
    "UserProfile",
]

_MODULE_MAP = {
    "User": "user",
    "Lesson": "lesson",
    "Phrase": "phrase",
    "LessonProgress": "lesson_progress",
    "Attempt": "attempt",
    "SRSMemory": "srs_memory",
    "Setting": "setting",
    "Meta": "meta",
    "UserSession": "user_session",
    "Badge": "badge",
    "UserBadge": "user_badge",
    "UserProfile": "user_profile",
}


def __getattr__(name):
    if name in _MODULE_MAP:
        module = import_module(f"src.models.{_MODULE_MAP[name]}")
        return getattr(module, name)
    raise AttributeError(name)


def __dir__():
    return sorted(__all__)
