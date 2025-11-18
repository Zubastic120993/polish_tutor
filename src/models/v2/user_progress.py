"""SQLAlchemy model for per-lesson learner progress."""

from uuid import uuid4

from sqlalchemy import Column, DateTime, Integer, String, func

from src.core.database import Base
from src.models.v2._types import UUID


class UserProgress(Base):
    """Tracks lesson progress and CEFR metadata for a user."""

    __tablename__ = "user_progress"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), index=True, nullable=False)
    lesson_id = Column(String, index=True, nullable=False)
    current_index = Column(Integer, default=0)
    total = Column(Integer, default=0)

    cefr_level = Column(String, default="A0")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
