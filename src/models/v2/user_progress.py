"""Placeholder UserProgress model for upcoming persistence work."""

from typing import Optional

from pydantic import BaseModel


class UserProgress(BaseModel):
    """Tracks lightweight learner progress across phrases."""

    user_id: str
    current_phrase_id: Optional[str] = None
    completed_phrases: int = 0
    streak: int = 0
    last_score: Optional[float] = None
