"""UserBadge model for tracking unlocked achievements per user."""

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, UniqueConstraint
from sqlalchemy.orm import relationship

from src.core.database import Base


class UserBadge(Base):
    """UserBadge table model for tracking which badges users have unlocked."""

    __tablename__ = "UserBadges"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer, ForeignKey("Users.id", ondelete="CASCADE"), nullable=False
    )
    badge_id = Column(
        Integer, ForeignKey("Badges.id", ondelete="CASCADE"), nullable=False
    )
    unlocked_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    user = relationship("User")
    badge = relationship("Badge", back_populates="user_badges")

    # Indexes and constraints
    __table_args__ = (
        Index("idx_user_badges_user", "user_id"),
        Index("idx_user_badges_badge", "badge_id"),
        UniqueConstraint("user_id", "badge_id", name="uq_user_badge"),
    )
