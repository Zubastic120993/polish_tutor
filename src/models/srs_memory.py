"""SRSMemory model."""
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship

from src.core.database import Base


class SRSMemory(Base):
    """SRSMemory table model."""

    __tablename__ = "SRSMemory"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("Users.id", ondelete="CASCADE"), nullable=False)
    phrase_id = Column(String, ForeignKey("Phrases.id", ondelete="CASCADE"), nullable=False)
    strength_level = Column(Integer, default=1)  # 1-5
    efactor = Column(Float, default=2.5)  # SM-2 ease factor
    interval_days = Column(Integer, default=1)
    next_review = Column(DateTime, nullable=False)
    last_review = Column(DateTime)
    review_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="srs_memories")
    phrase = relationship("Phrase", back_populates="srs_memories")

    # Constraints and indexes
    __table_args__ = (
        UniqueConstraint("user_id", "phrase_id", name="uq_user_phrase"),
        Index("idx_srs_user", "user_id"),
        Index("idx_srs_next_review", "next_review"),
        Index("idx_srs_phrase", "phrase_id"),
    )

