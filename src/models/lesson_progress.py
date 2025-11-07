"""LessonProgress model."""
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String, UniqueConstraint

from src.core.database import Base


class LessonProgress(Base):
    """LessonProgress table model."""

    __tablename__ = "LessonProgress"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("Users.id", ondelete="CASCADE"), nullable=False)
    lesson_id = Column(String, ForeignKey("Lessons.id", ondelete="CASCADE"), nullable=False)
    status = Column(String, default="not_started")  # not_started, in_progress, completed
    current_dialogue_id = Column(String)
    completed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Constraints and indexes
    __table_args__ = (
        UniqueConstraint("user_id", "lesson_id", name="uq_user_lesson"),
        Index("idx_lesson_progress_user", "user_id"),
        Index("idx_lesson_progress_lesson", "lesson_id"),
        Index("idx_lesson_progress_status", "status"),
    )

