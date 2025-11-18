"""Placeholder PhraseAttempt model for upcoming persistence work."""

from typing import Optional

from pydantic import BaseModel


class PhraseAttempt(BaseModel):
    """Represents a single user attempt at speaking a phrase."""

    phrase_id: str
    user_id: str
    transcript: str
    audio_url: Optional[str] = None
    score: float
    passed: bool
    feedback: Optional[str] = None
