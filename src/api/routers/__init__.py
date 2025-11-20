"""API router modules."""

from fastapi import APIRouter

from .v2.speech import router as speech_router
from .v2.evaluate import router as evaluate_router
from .v2.lessons import router as lessons_router
from .v2.user_progress import router as user_router
from ..v2.practice import practice_router
from ..v2.badges import router as badges_router
from ..v2.badge_history import router as badge_history_router
from ..v2.profile import router as profile_router
from ..v2.user_profile import router as user_profile_router

api_v2_router = APIRouter(prefix="/api/v2")
api_v2_router.include_router(speech_router, prefix="/speech")
api_v2_router.include_router(evaluate_router)
api_v2_router.include_router(lessons_router, prefix="/lesson")
api_v2_router.include_router(user_router, prefix="/user")
api_v2_router.include_router(practice_router)
api_v2_router.include_router(badges_router)
api_v2_router.include_router(badge_history_router)
api_v2_router.include_router(profile_router)
api_v2_router.include_router(user_profile_router)
