from typing import TypedDict

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/v2/user", tags=["user-v2"])


# Fake persistent in-memory state
class UserState(TypedDict):
    xp: int
    streak: int
    cefr: str


USER_STATE: UserState = {
    "xp": 80,
    "streak": 3,
    "cefr": "A0",
}


class ProgressResponse(BaseModel):
    xp: int
    streak: int
    cefr: str


class StatsResponse(BaseModel):
    xp_to_next: int = 600
    xp_level_progress: float
    cefr_progress: float = 0.1


@router.get("/progress", response_model=ProgressResponse)
async def get_progress():
    """Get user progress including XP, streak, and CEFR level."""
    return ProgressResponse(**USER_STATE)


@router.get("/stats", response_model=StatsResponse)
async def get_stats():
    """Get calculated user statistics."""
    xp = USER_STATE["xp"]
    xp_to_next = 600

    return StatsResponse(
        xp_to_next=xp_to_next, xp_level_progress=xp / xp_to_next, cefr_progress=0.1
    )


# Optional: Add update endpoint
class UpdateProgressRequest(BaseModel):
    xp: int | None = None
    streak: int | None = None
    cefr: str | None = None


@router.patch("/progress")
async def update_progress(data: UpdateProgressRequest):
    """Update user progress."""
    if data.xp is not None:
        USER_STATE["xp"] = data.xp
    if data.streak is not None:
        USER_STATE["streak"] = data.streak
    if data.cefr is not None:
        USER_STATE["cefr"] = data.cefr

    return ProgressResponse(**USER_STATE)
