"""UserSession model for tracking practice sessions."""

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer
from sqlalchemy.orm import relationship

from src.core.database import Base


class UserSession(Base):
    """UserSession table model for tracking user practice sessions."""

    __tablename__ = "UserSessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer, ForeignKey("Users.id", ondelete="CASCADE"), nullable=False
    )
    started_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    xp_phrases = Column(Integer, default=0)
    xp_session_bonus = Column(Integer, default=0)
    xp_streak_bonus = Column(Integer, default=0)
    total_xp = Column(Integer, default=0)
    streak_before = Column(Integer, default=0)
    streak_after = Column(Integer, default=0)

    # Relationship
    user = relationship("User")

    # Indexes
    __table_args__ = (
        Index("idx_user_sessions_user", "user_id"),
        Index("idx_user_sessions_started", "started_at"),
    )

