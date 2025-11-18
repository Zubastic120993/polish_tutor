"""API router modules."""

from fastapi import APIRouter

from .v2.speech import router as speech_router
from .v2.evaluate import router as evaluate_router
from .v2.lessons import router as lessons_router

api_v2_router = APIRouter(prefix="/api/v2")
api_v2_router.include_router(speech_router, prefix="/speech")
api_v2_router.include_router(evaluate_router)
api_v2_router.include_router(lessons_router, prefix="/lesson")
