"""Pydantic models for pronunciation and semantic evaluation."""

from typing import Literal

from pydantic import BaseModel


class EvaluateRequest(BaseModel):
    """Payload describing the phrase being evaluated and the user's attempt."""

    phrase_id: str
    user_transcript: str
    audio_url: str


class EvaluateResponse(BaseModel):
    """Evaluation results containing score, feedback, and next action."""

    score: float
    feedback: str
    hint: str
    passed: bool
    next_action: Literal["advance", "retry"]
