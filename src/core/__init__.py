"""Core application components exposed lazily to avoid circular imports."""

from importlib import import_module

__all__ = [
    "AppContext",
    "app_context",
    "Base",
    "SessionLocal",
    "engine",
    "LessonManager",
    "Tutor",
]


def __getattr__(name):
    if name in {"AppContext", "app_context"}:
        module = import_module("src.core.app_context")
        attr = getattr(module, name)
        globals()[name] = attr
        return attr
    if name in {"Base", "SessionLocal", "engine"}:
        module = import_module("src.core.database")
        attr = getattr(module, name)
        globals()[name] = attr
        return attr
    if name == "LessonManager":
        module = import_module("src.core.lesson_manager")
        LessonManager = getattr(module, "LessonManager")
        globals()[name] = LessonManager
        return LessonManager
    if name == "Tutor":
        module = import_module("src.core.tutor")
        Tutor = getattr(module, "Tutor")
        globals()[name] = Tutor
        return Tutor
    raise AttributeError(name)
