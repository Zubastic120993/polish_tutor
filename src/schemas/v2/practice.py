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
    correct_phrases: int = Field(..., ge=0, description="Number of correct phrases")
    total_phrases: int = Field(
        ..., ge=0, description="Total number of phrases practiced"
    )


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
    perfect_day: bool = False
    unlocked_badges: List[str] = Field(
        default_factory=list,
        description="List of badge codes newly unlocked in this session",
    )


class WeeklyStatsDay(BaseModel):
    """Daily statistics within a weekly period."""

    date: str = Field(..., description="Date in YYYY-MM-DD format")
    sessions: int = Field(..., ge=0, description="Number of sessions on this day")
    xp: int = Field(..., ge=0, description="Total XP earned on this day")
    time_seconds: int = Field(..., ge=0, description="Total practice time in seconds")


class WeeklyStatsResponse(BaseModel):
    """Weekly statistics for the last 7 days."""

    total_sessions: int = Field(
        ..., ge=0, description="Total number of sessions in the week"
    )
    total_xp: int = Field(..., ge=0, description="Total XP earned in the week")
    total_time_seconds: int = Field(
        ..., ge=0, description="Total practice time in seconds"
    )
    weekly_streak: int = Field(
        ..., ge=0, description="Number of unique days with at least one session"
    )
    days: List[WeeklyStatsDay] = Field(
        default_factory=list, description="Daily breakdown of statistics"
    )
