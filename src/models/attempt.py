"""Attempt model."""
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Float, Index, Integer, String, Text

from src.core.database import Base


class Attempt(Base):
    """Attempt table model."""

    __tablename__ = "Attempts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("Users.id", ondelete="CASCADE"), nullable=False)
    phrase_id = Column(String, ForeignKey("Phrases.id", ondelete="CASCADE"), nullable=False)
    user_input = Column(Text, nullable=False)
    score = Column(Float, nullable=False)  # 0.0 to 1.0
    phoneme_diffs = Column(Text)  # JSON array of mismatches
    feedback_type = Column(String)  # high, medium, low
    created_at = Column(DateTime, default=datetime.utcnow)

    # Indexes
    __table_args__ = (
        Index("idx_attempts_user", "user_id"),
        Index("idx_attempts_phrase", "phrase_id"),
        Index("idx_attempts_created", "created_at"),
    )

