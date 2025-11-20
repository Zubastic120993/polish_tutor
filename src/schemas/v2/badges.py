"""Pydantic schemas for badge APIs."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class BadgeBase(BaseModel):
    """Base badge schema with core fields."""

    code: str = Field(..., description="Unique badge code identifier")
    name: str = Field(..., description="Display name of the badge")
    description: str = Field(..., description="Description of how to earn the badge")
    icon: Optional[str] = Field(
        None, description="Badge icon (emoji or icon identifier)"
    )

    class Config:
        from_attributes = True


class UserBadgeResponse(BadgeBase):
    """Badge with unlock timestamp for a specific user."""

    unlocked_at: datetime = Field(..., description="When the badge was unlocked")

    class Config:
        from_attributes = True


class BadgeListResponse(BaseModel):
    """Response containing list of all available badges."""

    badges: List[BadgeBase] = Field(..., description="List of all badges in the system")


class UserBadgeListResponse(BaseModel):
    """Response containing list of badges unlocked by a user."""

    badges: List[UserBadgeResponse] = Field(
        ..., description="List of badges unlocked by the user"
    )


class SessionBadgeUnlockResponse(BaseModel):
    """Response containing badges unlocked during a specific session."""

    unlocked_badges: List[BadgeBase] = Field(
        ..., description="List of badges that were unlocked during this session"
    )
