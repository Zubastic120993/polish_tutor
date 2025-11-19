"""Pydantic models for pronunciation and semantic evaluation."""

from typing import Literal, Optional

from pydantic import BaseModel


class EvaluateRequest(BaseModel):
    """Payload describing the phrase being evaluated and the user's attempt."""

    phrase_id: str
    user_transcript: str
    audio_url: Optional[str] = None


class EvaluateResponse(BaseModel):
    """Evaluation results containing score, feedback, and next action."""

    score: float
    feedback: str
    hint: str
    passed: bool
    next_action: Literal["advance", "retry"]
    difficulty: Literal["easy", "medium", "hard"]
    error_type: Optional[
        Literal["pronunciation", "word_choice", "missing_word", "order"]
    ] = None
    recommendation: Literal[
        "proceed", "slow_down", "repeat_focus_word", "repeat_core", "full_retry"
    ]
    focus_word: Optional[str] = None
