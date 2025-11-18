"""Pydantic models for lesson navigation responses."""

from pydantic import BaseModel


class LessonNextResponse(BaseModel):
    """Metadata describing the next tutor phrase in a lesson."""

    lesson_id: str
    current_index: int
    total: int
    tutor_phrase: str
    expected_phrases: list[str]
