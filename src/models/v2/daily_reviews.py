"""SQLAlchemy model for spaced repetition daily reviews."""

from uuid import uuid4

from sqlalchemy import Column, DateTime, Float, Integer, String

from src.core.database import Base
from src.models.v2._types import UUID


class DailyReview(Base):
    """Tracks next review schedule for each phrase."""

    __tablename__ = "daily_reviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), index=True, nullable=False)
    phrase_id = Column(String, index=True, nullable=False)

    next_review = Column(DateTime(timezone=True), nullable=False)
    interval_days = Column(Integer, default=1)
    easiness = Column(Float, default=2.5)
