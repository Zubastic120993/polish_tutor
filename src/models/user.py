"""User model."""
from datetime import datetime

from sqlalchemy import Column, DateTime, Index, Integer, String
from sqlalchemy.orm import relationship

from src.core.database import Base


class User(Base):
    """User table model."""

    __tablename__ = "Users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    password_hash = Column(String, nullable=True)  # Nullable for backward compatibility during migration
    profile_template = Column(String, default="adult")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    lesson_progresses = relationship("LessonProgress", back_populates="user", cascade="all, delete-orphan")
    attempts = relationship("Attempt", back_populates="user", cascade="all, delete-orphan")
    srs_memories = relationship("SRSMemory", back_populates="user", cascade="all, delete-orphan")
    settings = relationship("Setting", back_populates="user", cascade="all, delete-orphan")

    # Indexes
    __table_args__ = (Index("idx_users_name", "name"),)

