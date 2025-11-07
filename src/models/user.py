"""User model."""
from datetime import datetime

from sqlalchemy import Column, DateTime, Index, Integer, String

from src.core.database import Base


class User(Base):
    """User table model."""

    __tablename__ = "Users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    profile_template = Column(String, default="adult")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Indexes
    __table_args__ = (Index("idx_users_name", "name"),)

