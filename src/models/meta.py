"""Meta model."""

from datetime import datetime

from sqlalchemy import Column, DateTime, String

from src.core.database import Base


class Meta(Base):
    """Meta table model."""

    __tablename__ = "Meta"

    key = Column(String, primary_key=True)
    value = Column(String, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
