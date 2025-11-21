"""SQLAlchemy model for storing phrase evaluation attempts."""

from uuid import uuid4

from sqlalchemy import Column, DateTime, Float, Integer, String, Text
from sqlalchemy.sql import func

from src.core.database import Base
from src.models.v2._types import UUID


class PhraseAttempt(Base):
    """Stores every user evaluation attempt with scoring details."""

    __tablename__ = "phrase_attempts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), index=True, nullable=False)
    phrase_id = Column(String, index=True, nullable=False)
    transcript = Column(Text, nullable=False)

    score = Column(Float, nullable=False)
    phonetic_distance = Column(Float, nullable=False)
    semantic_accuracy = Column(Float, nullable=False)

    response_time_ms = Column(Integer, nullable=True)
    audio_ref = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
