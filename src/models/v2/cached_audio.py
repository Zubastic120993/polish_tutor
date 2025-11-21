"""SQLAlchemy model for caching generated audio metadata."""

from uuid import uuid4

from sqlalchemy import Column, DateTime, String
from sqlalchemy.sql import func

from src.core.database import Base
from src.models.v2._types import UUID


class CachedAudio(Base):
    """Stores references to generated audio blobs for reuse."""

    __tablename__ = "cached_audio"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    audio_ref = Column(String, index=True, nullable=False)
    hash = Column(String, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
