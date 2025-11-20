"""Pydantic schemas for user profile API."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class UserProfileResponse(BaseModel):
    """User profile response schema."""

    user_id: int
    username: str
    avatar: str
    goal_text: Optional[str] = None
    goal_created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserProfileUpdate(BaseModel):
    """User profile update request schema."""

    username: str = Field(..., min_length=1, max_length=50)
    avatar: str = Field(..., min_length=1, max_length=10)
    goal_text: Optional[str] = Field(None, max_length=200)
    goal_created_at: Optional[datetime] = None
