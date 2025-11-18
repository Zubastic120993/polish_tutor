"""SQLAlchemy model for aggregated learner statistics."""

from uuid import uuid4

from sqlalchemy import Column, DateTime, Integer, func

from src.core.database import Base
from src.models.v2._types import UUID


class UserStats(Base):
    """Aggregated stats for streaks, XP, and speaking attempts."""

    __tablename__ = "user_stats"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), index=True, nullable=False)

    xp = Column(Integer, default=0)
    streak = Column(Integer, default=0)
    total_attempts = Column(Integer, default=0)
    total_passed = Column(Integer, default=0)

    updated_at = Column(DateTime(timezone=True), server_default=func.now())
