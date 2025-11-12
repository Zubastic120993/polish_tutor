"""Lesson model."""

from datetime import datetime

from sqlalchemy import Column, DateTime, Index, String, Text
from sqlalchemy.orm import relationship

from src.core.database import Base


class Lesson(Base):
    """Lesson table model."""

    __tablename__ = "Lessons"

    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    level = Column(String, nullable=False)
    tags = Column(Text)  # JSON array stored as text
    cefr_goal = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    phrases = relationship(
        "Phrase", back_populates="lesson", cascade="all, delete-orphan"
    )
    lesson_progresses = relationship(
        "LessonProgress", back_populates="lesson", cascade="all, delete-orphan"
    )

    # Indexes
    __table_args__ = (Index("idx_lessons_level", "level"),)
