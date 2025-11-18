"""Phase B: Evaluation endpoint (stub)."""

from fastapi import APIRouter
from src.schemas.v2.evaluate import EvaluateRequest, EvaluateResponse

# IMPORTANT:
# prefix="", and route path="" instead of "/"
# gives final endpoint:  /api/v2/evaluate
router = APIRouter(prefix="/evaluate")
print("DEBUG: Evaluate router loaded with prefix:", router.prefix)


@router.post("", response_model=EvaluateResponse)
async def evaluate(payload: EvaluateRequest):
    """Stub evaluation endpoint — returns mock scoring."""
    return EvaluateResponse(
        score=0.88,
        feedback="Mock feedback",
        hint="Mock hint",
        passed=True,
        next_action="advance",
    )
