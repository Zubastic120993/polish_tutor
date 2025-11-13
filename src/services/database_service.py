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
        """Initialize database service.

        Args:
            session_factory: SQLAlchemy session factory (default: SessionLocal)
        """
        self.session_factory = session_factory

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
        """Expunge instance from session to make it usable after session closes."""
        session.expunge(instance)
        return instance

    # ------------------- Generic CRUD operations -------------------

    def create(self, model_class: Type[ModelType], **kwargs: Any) -> ModelType:
        """Create a new record."""
        with self.get_session() as session:
            instance = model_class(**kwargs)
            session.add(instance)
            session.flush()
            session.refresh(instance)
            return self._expunge_instance(session, instance)

    def get_by_id(self, model_class: Type[ModelType], id: Any) -> Optional[ModelType]:
        """Get a record by ID."""
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
        """Get all records."""
        with self.get_session() as session:
            query = session.query(model_class)
            if limit:
                query = query.limit(limit)
            instances = query.all()
            return [self._expunge_instance(session, inst) for inst in instances]

    def update(
        self, model_class: Type[ModelType], id: Any, **kwargs: Any
    ) -> Optional[ModelType]:
        """Update a record."""
        with self.get_session() as session:
            instance = (
                session.query(model_class)
                .filter(model_class.id == id)  # type: ignore[attr-defined]
                .first()
            )
            if instance:
                for key, value in kwargs.items():
                    if hasattr(instance, key):
                        setattr(instance, key, value)
                session.flush()
                session.refresh(instance)
                return self._expunge_instance(session, instance)
            return None

    def delete(self, model_class: Type[ModelType], id: Any) -> bool:
        """Delete a record."""
        with self.get_session() as session:
            instance = (
                session.query(model_class)
                .filter(model_class.id == id)  # type: ignore[attr-defined]
                .first()
            )
            if instance:
                session.delete(instance)
                session.commit()
                return True
            return False

    # ------------------- User CRUD operations -------------------

    def create_user(self, name: str, profile_template: str = "adult") -> User:
        """Create a new user."""
        return self.create(User, name=name, profile_template=profile_template)

    def get_user(self, user_id: int) -> Optional[User]:
        """Get user by ID."""
        return self.get_by_id(User, user_id)

    def get_user_by_name(self, name: str) -> Optional[User]:
        """Get user by name."""
        with self.get_session() as session:
            return session.query(User).filter(User.name == name).first()

    def update_user(self, user_id: int, **kwargs: Any) -> Optional[User]:
        """Update user."""
        return self.update(User, user_id, **kwargs)

    def delete_user(self, user_id: int) -> bool:
        """Delete user."""
        return self.delete(User, user_id)

    # ------------------- Lesson CRUD operations -------------------

    def create_lesson(self, lesson_id: str, title: str, level: str, **kwargs: Any) -> Lesson:
        """Create a new lesson."""
        return self.create(Lesson, id=lesson_id, title=title, level=level, **kwargs)

    def get_lesson(self, lesson_id: str) -> Optional[Lesson]:
        """Get lesson by ID."""
        return self.get_by_id(Lesson, lesson_id)

    def get_lessons_by_level(self, level: str) -> List[Lesson]:
        """Get all lessons by level."""
        with self.get_session() as session:
            return session.query(Lesson).filter(Lesson.level == level).all()

    def update_lesson(self, lesson_id: str, **kwargs: Any) -> Optional[Lesson]:
        """Update lesson."""
        return self.update(Lesson, lesson_id, **kwargs)

    def delete_lesson(self, lesson_id: str) -> bool:
        """Delete lesson."""
        return self.delete(Lesson, lesson_id)

    # ------------------- Phrase CRUD operations -------------------

    def create_phrase(
        self, phrase_id: str, lesson_id: str, text: str, **kwargs: Any
    ) -> Phrase:
        """Create a new phrase."""
        return self.create(Phrase, id=phrase_id, lesson_id=lesson_id, text=text, **kwargs)

    def get_phrase(self, phrase_id: str) -> Optional[Phrase]:
        """Get phrase by ID."""
        return self.get_by_id(Phrase, phrase_id)

    def get_phrases_by_lesson(self, lesson_id: str) -> List[Phrase]:
        """Get all phrases for a lesson."""
        with self.get_session() as session:
            return session.query(Phrase).filter(Phrase.lesson_id == lesson_id).all()

    def update_phrase(self, phrase_id: str, **kwargs: Any) -> Optional[Phrase]:
        """Update phrase."""
        return self.update(Phrase, phrase_id, **kwargs)

    def delete_phrase(self, phrase_id: str) -> bool:
        """Delete phrase."""
        return self.delete(Phrase, phrase_id)

    # ------------------- LessonProgress CRUD operations -------------------

    def create_lesson_progress(
        self, user_id: int, lesson_id: str, status: str = "not_started", **kwargs: Any
    ) -> LessonProgress:
        """Create a new lesson progress."""
        return self.create(
            LessonProgress,
            user_id=user_id,
            lesson_id=lesson_id,
            status=status,
            **kwargs,
        )

    def get_lesson_progress(self, progress_id: int) -> Optional[LessonProgress]:
        """Get lesson progress by ID."""
        return self.get_by_id(LessonProgress, progress_id)

    def get_user_lesson_progress(
        self, user_id: int, lesson_id: str
    ) -> Optional[LessonProgress]:
        """Get lesson progress for a specific user and lesson."""
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
        """Get all lesson progresses for a user."""
        with self.get_session() as session:
            return (
                session.query(LessonProgress)
                .filter(LessonProgress.user_id == user_id)
                .all()
            )

    def update_lesson_progress(
        self, progress_id: int, **kwargs: Any
    ) -> Optional[LessonProgress]:
        """Update lesson progress."""
        return self.update(LessonProgress, progress_id, **kwargs)

    def delete_lesson_progress(self, progress_id: int) -> bool:
        """Delete lesson progress."""
        return self.delete(LessonProgress, progress_id)

    # ------------------- Attempt CRUD operations -------------------

    def create_attempt(
        self,
        user_id: int,
        phrase_id: str,
        user_input: str,
        score: float,
        feedback_type: Optional[str] = None,
        **kwargs: Any,
    ) -> Attempt:
        """Create a new attempt."""
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
        """Get attempt by ID."""
        return self.get_by_id(Attempt, attempt_id)

    def get_user_attempts(
        self, user_id: int, limit: Optional[int] = None
    ) -> List[Attempt]:
        """Get all attempts for a user."""
        with self.get_session() as session:
            query = (
                session.query(Attempt)
                .filter(Attempt.user_id == user_id)
                .order_by(Attempt.created_at.desc())
            )
            if limit:
                query = query.limit(limit)
            attempts = query.all()
            for attempt in attempts:
                _ = attempt.id
                _ = attempt.phrase_id
                _ = attempt.user_input
                _ = attempt.score
                _ = attempt.feedback_type
                _ = attempt.created_at
                session.expunge(attempt)
            return attempts

    def get_phrase_attempts(
        self, phrase_id: str, limit: Optional[int] = None
    ) -> List[Attempt]:
        """Get all attempts for a phrase."""
        with self.get_session() as session:
            query = (
                session.query(Attempt)
                .filter(Attempt.phrase_id == phrase_id)
                .order_by(Attempt.created_at.desc())
            )
            if limit:
                query = query.limit(limit)
            attempts = query.all()
            for attempt in attempts:
                _ = attempt.id
                _ = attempt.user_id
                _ = attempt.user_input
                _ = attempt.score
                _ = attempt.feedback_type
                _ = attempt.created_at
                session.expunge(attempt)
            return attempts

    def update_attempt(self, attempt_id: int, **kwargs: Any) -> Optional[Attempt]:
        """Update attempt."""
        return self.update(Attempt, attempt_id, **kwargs)

    def delete_attempt(self, attempt_id: int) -> bool:
        """Delete attempt."""
        return self.delete(Attempt, attempt_id)
        