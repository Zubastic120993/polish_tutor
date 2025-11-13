"""Database service layer with CRUD operations."""

from contextlib import contextmanager
from typing import Any, Dict, List, Optional, Type, TypeVar

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from src.core.database import SessionLocal
from src.models import (
    Attempt,
    Lesson,
    LessonProgress,
    Meta,
    Phrase,
    Setting,
    SRSMemory,
    User,
)

ModelType = TypeVar("ModelType")


class Database:
    """Database service layer providing CRUD operations for all tables."""

    def __init__(self, session_factory=SessionLocal):
        """Initialize database service."""
        self.session_factory = session_factory

    # ------------------------------------------------------------------
    # Context manager for sessions
    # ------------------------------------------------------------------
    @contextmanager
    def get_session(self):
        """Context manager for database sessions with automatic cleanup."""
        session = self.session_factory()
        try:
            yield session
            session.commit()
        except SQLAlchemyError:
            session.rollback()
            raise
        finally:
            session.close()

    def _expunge_instance(self, session: Session, instance: ModelType) -> ModelType:
        """Detach instance from session to make it usable after commit."""
        session.expunge(instance)
        return instance

    # ------------------------------------------------------------------
    # Generic CRUD
    # ------------------------------------------------------------------
    def create(self, model_class: Type[ModelType], **kwargs: Any) -> ModelType:
        with self.get_session() as session:
            instance = model_class(**kwargs)
            session.add(instance)
            session.flush()
            session.refresh(instance)
            return self._expunge_instance(session, instance)

    def get_by_id(self, model_class: Type[ModelType], id: Any) -> Optional[ModelType]:
        with self.get_session() as session:
            instance = (
                session.query(model_class)
                .filter(model_class.id == id)  # type: ignore[attr-defined]
                .first()
            )
            if instance:
                return self._expunge_instance(session, instance)
            return None

    def get_all(
        self, model_class: Type[ModelType], limit: Optional[int] = None
    ) -> List[ModelType]:
        with self.get_session() as session:
            query = session.query(model_class)
            if limit:
                query = query.limit(limit)
            items = query.all()
            return [self._expunge_instance(session, i) for i in items]

    def update(
        self, model_class: Type[ModelType], id: Any, **kwargs: Any
    ) -> Optional[ModelType]:
        with self.get_session() as session:
            instance = (
                session.query(model_class)
                .filter(model_class.id == id)  # type: ignore[attr-defined]
                .first()
            )
            if not instance:
                return None
            for key, value in kwargs.items():
                if hasattr(instance, key):
                    setattr(instance, key, value)
            session.flush()
            session.refresh(instance)
            return self._expunge_instance(session, instance)

    def delete(self, model_class: Type[ModelType], id: Any) -> bool:
        with self.get_session() as session:
            instance = (
                session.query(model_class)
                .filter(model_class.id == id)  # type: ignore[attr-defined]
                .first()
            )
            if not instance:
                return False
            session.delete(instance)
            session.commit()
            return True

    # ------------------------------------------------------------------
    # User CRUD
    # ------------------------------------------------------------------
    def create_user(self, name: str, profile_template: str = "adult") -> User:
        return self.create(User, name=name, profile_template=profile_template)

    def get_user(self, user_id: int) -> Optional[User]:
        return self.get_by_id(User, user_id)

    def get_user_by_name(self, name: str) -> Optional[User]:
        with self.get_session() as session:
            return session.query(User).filter(User.name == name).first()

    def update_user(self, user_id: int, **kwargs: Any) -> Optional[User]:
        return self.update(User, user_id, **kwargs)

    def delete_user(self, user_id: int) -> bool:
        return self.delete(User, user_id)

    # ------------------------------------------------------------------
    # Lesson CRUD
    # ------------------------------------------------------------------
    def create_lesson(
        self, lesson_id: str, title: str, level: str, **kwargs: Any
    ) -> Lesson:
        return self.create(Lesson, id=lesson_id, title=title, level=level, **kwargs)

    def get_lesson(self, lesson_id: str) -> Optional[Lesson]:
        return self.get_by_id(Lesson, lesson_id)

    def get_lessons_by_level(self, level: str) -> List[Lesson]:
        with self.get_session() as session:
            return session.query(Lesson).filter(Lesson.level == level).all()

    def update_lesson(self, lesson_id: str, **kwargs: Any) -> Optional[Lesson]:
        return self.update(Lesson, lesson_id, **kwargs)

    def delete_lesson(self, lesson_id: str) -> bool:
        return self.delete(Lesson, lesson_id)

    # ------------------------------------------------------------------
    # Phrase CRUD
    # ------------------------------------------------------------------
    def create_phrase(
        self, phrase_id: str, lesson_id: str, text: str, **kwargs: Any
    ) -> Phrase:
        return self.create(
            Phrase, id=phrase_id, lesson_id=lesson_id, text=text, **kwargs
        )

    def get_phrase(self, phrase_id: str) -> Optional[Phrase]:
        return self.get_by_id(Phrase, phrase_id)

    def get_phrases_by_lesson(self, lesson_id: str) -> List[Phrase]:
        with self.get_session() as session:
            return session.query(Phrase).filter(Phrase.lesson_id == lesson_id).all()

    def update_phrase(self, phrase_id: str, **kwargs: Any) -> Optional[Phrase]:
        return self.update(Phrase, phrase_id, **kwargs)

    def delete_phrase(self, phrase_id: str) -> bool:
        return self.delete(Phrase, phrase_id)

    # ------------------------------------------------------------------
    # Lesson Progress CRUD
    # ------------------------------------------------------------------
    def create_lesson_progress(
        self, user_id: int, lesson_id: str, status: str = "not_started", **kwargs: Any
    ) -> LessonProgress:
        return self.create(
            LessonProgress,
            user_id=user_id,
            lesson_id=lesson_id,
            status=status,
            **kwargs,
        )

    def get_lesson_progress(self, progress_id: int) -> Optional[LessonProgress]:
        return self.get_by_id(LessonProgress, progress_id)

    def get_user_lesson_progress(
        self, user_id: int, lesson_id: str
    ) -> Optional[LessonProgress]:
        with self.get_session() as session:
            return (
                session.query(LessonProgress)
                .filter(
                    LessonProgress.user_id == user_id,
                    LessonProgress.lesson_id == lesson_id,
                )
                .first()
            )

    def get_user_progresses(self, user_id: int) -> List[LessonProgress]:
        with self.get_session() as session:
            return (
                session.query(LessonProgress)
                .filter(LessonProgress.user_id == user_id)
                .all()
            )

    def update_lesson_progress(
        self, progress_id: int, **kwargs: Any
    ) -> Optional[LessonProgress]:
        return self.update(LessonProgress, progress_id, **kwargs)

    def delete_lesson_progress(self, progress_id: int) -> bool:
        return self.delete(LessonProgress, progress_id)

    # ------------------------------------------------------------------
    # Attempt CRUD
    # ------------------------------------------------------------------
    def create_attempt(
        self,
        user_id: int,
        phrase_id: str,
        user_input: str,
        score: float,
        feedback_type: Optional[str] = None,
        **kwargs: Any,
    ) -> Attempt:
        return self.create(
            Attempt,
            user_id=user_id,
            phrase_id=phrase_id,
            user_input=user_input,
            score=score,
            feedback_type=feedback_type,
            **kwargs,
        )

    def get_attempt(self, attempt_id: int) -> Optional[Attempt]:
        return self.get_by_id(Attempt, attempt_id)

    def get_user_attempts(
        self, user_id: int, limit: Optional[int] = None
    ) -> List[Attempt]:
        with self.get_session() as session:
            query = (
                session.query(Attempt)
                .filter(Attempt.user_id == user_id)
                .order_by(Attempt.created_at.desc())
            )
            if limit:
                query = query.limit(limit)
            attempts = query.all()
            for a in attempts:
                session.expunge(a)
            return attempts

    def get_phrase_attempts(
        self, phrase_id: str, limit: Optional[int] = None
    ) -> List[Attempt]:
        with self.get_session() as session:
            query = (
                session.query(Attempt)
                .filter(Attempt.phrase_id == phrase_id)
                .order_by(Attempt.created_at.desc())
            )
            if limit:
                query = query.limit(limit)
            attempts = query.all()
            for a in attempts:
                session.expunge(a)
            return attempts

    def update_attempt(self, attempt_id: int, **kwargs: Any) -> Optional[Attempt]:
        return self.update(Attempt, attempt_id, **kwargs)

    def delete_attempt(self, attempt_id: int) -> bool:
        return self.delete(Attempt, attempt_id)

    # ------------------------------------------------------------------
    # EXTRA METHODS FOR SETTINGS & SRS
    # ------------------------------------------------------------------
    def get_user_settings(self, user_id: int) -> Dict[str, Any]:
        """Return all settings for a user."""
        with self.get_session() as session:
            rows = session.query(Setting).filter(Setting.user_id == user_id).all()
            return {row.key: row.value for row in rows}

    def get_user_setting(self, user_id: int, key: str) -> Optional[Any]:
        """Return a single setting for a user."""
        with self.get_session() as session:
            setting = (
                session.query(Setting)
                .filter(Setting.user_id == user_id, Setting.key == key)
                .first()
            )
            return setting.value if setting else None

    def upsert_setting(self, user_id: int, key: str, value: Any) -> None:
        """Insert or update a setting for a user."""
        with self.get_session() as session:
            existing = (
                session.query(Setting)
                .filter(Setting.user_id == user_id, Setting.key == key)
                .first()
            )
            if existing:
                existing.value = value
            else:
                session.add(Setting(user_id=user_id, key=key, value=value))
            session.flush()

    def get_due_srs_items(self, user_id: int) -> List[Dict[str, Any]]:
        """Return SRS items due for review."""
        with self.get_session() as session:
            items = session.query(SRSMemory).filter(SRSMemory.user_id == user_id).all()
            return [
                dict(id=i.id, phrase_id=i.phrase_id, due_at=getattr(i, "due_at", None))
                for i in items
            ]

    def get_user_srs_memories(self, user_id: int) -> List[Dict[str, Any]]:
        """Return all SRS memories for a user."""
        with self.get_session() as session:
            items = session.query(SRSMemory).filter(SRSMemory.user_id == user_id).all()
            return [
                dict(
                    id=i.id,
                    phrase_id=i.phrase_id,
                    quality=getattr(i, "quality", None),
                )
                for i in items
            ]

    def create_srs_memory(
        self,
        user_id: int,
        phrase_id: str,
        next_review: Any,
        interval_days: int,
        review_count: int,
        strength_level: int,
    ) -> SRSMemory:
        """Create and return a new SRS memory entry."""
        return self.create(
            SRSMemory,
            user_id=user_id,
            phrase_id=phrase_id,
            next_review=next_review,
            interval_days=interval_days,
            review_count=review_count,
            strength_level=strength_level,
        )

    def delete_srs_memory(self, srs_id: int) -> bool:
        """Delete an SRS memory entry by its ID."""
        return self.delete(SRSMemory, srs_id)
