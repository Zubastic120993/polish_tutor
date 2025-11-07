"""Pydantic schemas for API request/response models."""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


# Base response schema
class APIResponse(BaseModel):
    """Base API response schema."""
    status: str = Field(..., description="Response status: 'success' or 'error'")
    message: str = Field(..., description="Human-readable message")
    data: Optional[dict] = Field(None, description="Response data payload")
    metadata: Optional[dict] = Field(None, description="Additional metadata")


# Chat endpoints
class ChatRespondRequest(BaseModel):
    """Request schema for POST /chat/respond."""
    user_id: int = Field(..., description="User ID", gt=0)
    text: str = Field(..., description="User's input text", min_length=1)
    lesson_id: str = Field(..., description="Current lesson ID")
    dialogue_id: str = Field(..., description="Current dialogue ID")
    speed: Optional[float] = Field(1.0, description="Audio playback speed (0.75 or 1.0)", ge=0.75, le=1.0)
    confidence: Optional[int] = Field(None, description="Confidence slider value (1-5)", ge=1, le=5)


class ChatRespondData(BaseModel):
    """Response data for POST /chat/respond."""
    reply_text: str
    score: float = Field(..., ge=0.0, le=1.0)
    feedback_type: str = Field(..., pattern="^(high|medium|low)$")
    hint: Optional[str] = None
    grammar_explanation: Optional[str] = None
    audio: List[str] = Field(default_factory=list)
    next_dialogue_id: Optional[str] = None
    show_answer: Optional[bool] = False
    expected_phrase: Optional[str] = None


class ChatRespondResponse(APIResponse):
    """Response schema for POST /chat/respond."""
    data: Optional[ChatRespondData] = None
    metadata: Optional[dict] = Field(None, description="Contains attempt_id and timestamp")


# Lesson endpoints
class LessonGetResponse(APIResponse):
    """Response schema for GET /lesson/get."""
    data: Optional[dict] = Field(None, description="Lesson data with id, title, level, dialogues")


class LessonOptionsResponse(APIResponse):
    """Response schema for GET /lesson/options."""
    data: Optional[dict] = Field(None, description="Branch options for current dialogue")


# Review endpoints
class ReviewUpdateRequest(BaseModel):
    """Request schema for POST /review/update."""
    user_id: int = Field(..., description="User ID", gt=0)
    phrase_id: str = Field(..., description="Phrase ID")
    quality: int = Field(..., description="Quality score (0-5)", ge=0, le=5)
    confidence: Optional[int] = Field(None, description="Confidence slider value (1-5)", ge=1, le=5)


class ReviewUpdateData(BaseModel):
    """Response data for POST /review/update."""
    next_review: str = Field(..., description="ISO 8601 timestamp of next review")
    efactor: float = Field(..., description="Updated ease factor")
    interval_days: int = Field(..., description="Review interval in days")


class ReviewUpdateResponse(APIResponse):
    """Response schema for POST /review/update."""
    data: Optional[ReviewUpdateData] = None


class ReviewGetResponse(APIResponse):
    """Response schema for GET /review/get."""
    data: Optional[List[dict]] = Field(None, description="List of due SRS items")


# Settings endpoints
class SettingsUpdateRequest(BaseModel):
    """Request schema for POST /settings/update."""
    user_id: int = Field(..., description="User ID", gt=0)
    voice_mode: Optional[str] = Field(None, description="Voice mode: 'offline' or 'online'", pattern="^(offline|online)$")
    audio_speed: Optional[float] = Field(None, description="Audio speed (0.75 or 1.0)", ge=0.75, le=1.0)
    confidence_slider: Optional[int] = Field(None, description="Confidence slider value (1-5)", ge=1, le=5)
    theme: Optional[str] = Field(None, description="UI theme")
    language: Optional[str] = Field(None, description="UI language")


class SettingsGetResponse(APIResponse):
    """Response schema for GET /settings/get."""
    data: Optional[dict] = Field(None, description="User settings")


class SettingsUpdateResponse(APIResponse):
    """Response schema for POST /settings/update."""
    data: Optional[dict] = Field(None, description="Updated settings")


# User stats endpoint
class UserStatsResponse(APIResponse):
    """Response schema for GET /user/stats."""
    data: Optional[dict] = Field(None, description="User statistics including progress, study time, accuracy")


# Audio endpoint
class AudioGenerateRequest(BaseModel):
    """Request schema for POST /audio/generate."""
    text: str = Field(..., description="Text to generate audio for", min_length=1)
    lesson_id: Optional[str] = Field(None, description="Lesson ID for caching")
    phrase_id: Optional[str] = Field(None, description="Phrase ID for caching")
    speed: Optional[float] = Field(1.0, description="Audio playback speed (0.75 or 1.0)", ge=0.75, le=1.0)


class AudioGenerateResponse(APIResponse):
    """Response schema for POST /audio/generate."""
    data: Optional[dict] = Field(None, description="Contains audio_url")


# Backup endpoint
class BackupExportResponse(APIResponse):
    """Response schema for GET /backup/export."""
    data: Optional[dict] = Field(None, description="Backup data or download URL")


# Error reporting endpoint
class ErrorReportRequest(BaseModel):
    """Request schema for POST /error/report."""
    user_id: Optional[int] = Field(None, description="User ID", gt=0)
    error_type: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    stack_trace: Optional[str] = Field(None, description="Stack trace")
    context: Optional[dict] = Field(None, description="Additional context")


class ErrorReportResponse(APIResponse):
    """Response schema for POST /error/report."""
    data: Optional[dict] = Field(None, description="Error report ID")

