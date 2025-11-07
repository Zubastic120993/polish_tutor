"""Phrase model."""
from sqlalchemy import Column, ForeignKey, Index, String, Text
from sqlalchemy.orm import relationship

from src.core.database import Base


class Phrase(Base):
    """Phrase table model."""

    __tablename__ = "Phrases"

    id = Column(String, primary_key=True)
    lesson_id = Column(String, ForeignKey("Lessons.id", ondelete="CASCADE"), nullable=False)
    text = Column(Text, nullable=False)
    grammar = Column(Text)
    audio_path = Column(Text)

    # Relationships
    lesson = relationship("Lesson", back_populates="phrases")
    attempts = relationship("Attempt", back_populates="phrase", cascade="all, delete-orphan")
    srs_memories = relationship("SRSMemory", back_populates="phrase", cascade="all, delete-orphan")

    # Indexes
    __table_args__ = (Index("idx_phrases_lesson", "lesson_id"),)

