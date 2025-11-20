"""Pydantic schemas for user profile API."""

from typing import List, Optional

from pydantic import BaseModel


class ProfileBadge(BaseModel):
    """Badge summary for profile display."""

    code: str
    name: str
    icon: Optional[str] = None

    class Config:
        from_attributes = True


class ProfileResponse(BaseModel):
    """User profile summary response."""

    user_id: int
    total_xp: int
    total_sessions: int
    current_streak: int
    level: int
    next_level_xp: int
    xp_for_next_level: int
    best_badges: List[ProfileBadge]
