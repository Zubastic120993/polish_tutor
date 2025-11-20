"""Pydantic schemas for badge history API."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class BadgeHistoryItem(BaseModel):
    """Single badge unlock history entry."""

    code: str
    name: str
    description: str
    icon: Optional[str] = None
    unlocked_at: datetime

    class Config:
        from_attributes = True


class BadgeHistoryResponse(BaseModel):
    """Response schema for badge unlock history."""

    history: List[BadgeHistoryItem]
