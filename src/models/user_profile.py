"""UserProfile model for storing user customization data."""

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from src.core.database import Base


class UserProfile(Base):
    """UserProfile table model for user customization."""

    __tablename__ = "UserProfiles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer, ForeignKey("Users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    username = Column(String(50), default="Learner", nullable=False)
    avatar = Column(String(10), default="🙂", nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    goal_text = Column(String(200), nullable=True, default=None)
    goal_created_at = Column(DateTime(timezone=True), nullable=True, default=None)

    # Relationship
    user = relationship("User")
