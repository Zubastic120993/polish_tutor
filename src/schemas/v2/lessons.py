"""Pydantic models for lesson navigation responses."""

from typing import List

from pydantic import BaseModel


class LessonPhraseMeta(BaseModel):
    """Metadata for a single tutor phrase."""

    id: str
    pl: str
    en: str


class LessonMetaResponse(BaseModel):
    """Full lesson manifest returned to the React client."""

    lesson_id: str
    phrases: List[LessonPhraseMeta]


class LessonNextResponse(BaseModel):
    """Metadata describing the next tutor phrase in a lesson."""

    lesson_id: str
    current_index: int
    total: int
    tutor_phrase: str
    expected_phrases: List[str]
    audio_url: str | None = None
