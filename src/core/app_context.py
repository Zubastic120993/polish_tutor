"""Application context for dependency injection."""
from typing import Optional

from src.core.database import SessionLocal
from src.core.tutor import Tutor
from src.services.database_service import Database


class AppContext:
    """Central dependency registry providing shared instances."""

    def __init__(self):
        """Initialize application context."""
        self._db_session_factory = SessionLocal
        self._config: Optional[dict] = None
        self._cache_manager = None  # Will be implemented later
        self._tutor: Optional[Tutor] = None
        self._database: Optional[Database] = None

    @property
    def db_session_factory(self):
        """Get database session factory."""
        return self._db_session_factory

    @property
    def config(self) -> dict:
        """Get application configuration."""
        if self._config is None:
            import os
            from dotenv import load_dotenv
            load_dotenv()
            self._config = {
                "database_url": os.getenv("DATABASE_URL", "sqlite:///./data/polish_tutor.db"),
                "debug": os.getenv("DEBUG", "False").lower() == "true",
                "log_level": os.getenv("LOG_LEVEL", "INFO"),
                "host": os.getenv("HOST", "0.0.0.0"),
                "port": int(os.getenv("PORT", "8000")),
            }
        return self._config

    @property
    def cache_manager(self):
        """Get cache manager (placeholder for future implementation)."""
        return self._cache_manager

    @property
    def database(self) -> Database:
        """Get database service instance."""
        if self._database is None:
            self._database = Database(session_factory=self._db_session_factory)
        return self._database

    @property
    def tutor(self) -> Tutor:
        """Get Tutor instance."""
        if self._tutor is None:
            self._tutor = Tutor(database=self.database)
        return self._tutor


# Global app context instance
app_context = AppContext()

