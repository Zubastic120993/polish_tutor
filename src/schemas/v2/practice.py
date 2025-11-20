"""Pydantic models for practice pack APIs."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class PhraseItem(BaseModel):
    """Single practice phrase entry."""

    id: str
    polish: str
    english: str
    audio_url: Optional[str] = None
    expected_responses: Optional[List[str]] = None


class DialogItem(BaseModel):
    """Placeholder dialog practice payload."""

    id: str
    title: Optional[str] = None
    turns: List[str] = Field(default_factory=list)


class DrillItem(BaseModel):
    """Placeholder pronunciation drill payload."""

    id: str
    prompt: str
    instructions: Optional[str] = None


class PracticePackResponse(BaseModel):
    """Practice pack payload supporting future practice types."""

    pack_id: str
    session_id: Optional[int] = None
    review_phrases: List[PhraseItem]
    new_phrases: List[PhraseItem] = Field(default_factory=list)
    dialog: Optional[DialogItem] = None
    pronunciation_drill: Optional[DrillItem] = None


class EndSessionRequest(BaseModel):
    """Request payload for ending a practice session."""

    session_id: int = Field(..., gt=0, description="The ID of the session to end")
    xp_from_phrases: int = Field(..., ge=0, description="XP earned from phrases")


class EndSessionResponse(BaseModel):
    """Response payload for ended practice session."""

    session_id: int
    session_start: datetime
    session_end: datetime
    session_duration_seconds: int
    xp_total: int
    xp_from_phrases: int
    xp_session_bonus: int = 0
    xp_streak_bonus: int = 0
    streak_before: int = 0
    streak_after: int = 0
