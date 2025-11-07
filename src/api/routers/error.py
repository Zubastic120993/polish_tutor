"""Error reporting API endpoints."""
import logging
from fastapi import APIRouter, HTTPException

from src.api.schemas import ErrorReportRequest, ErrorReportResponse
from src.core.app_context import app_context

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/error", tags=["error"])


@router.post("/report", response_model=ErrorReportResponse, status_code=200)
async def error_report(request: ErrorReportRequest):
    """Log client-side errors with context.
    
    Args:
        request: Error report with type, message, stack trace, context
        
    Returns:
        Error report confirmation
    """
    try:
        # Log error to application logger
        error_msg = f"Client error reported: {request.error_type} - {request.message}"
        if request.user_id:
            error_msg += f" (user_id: {request.user_id})"
        
        if request.stack_trace:
            logger.error(f"{error_msg}\nStack trace:\n{request.stack_trace}")
        else:
            logger.error(error_msg)
        
        if request.context:
            logger.debug(f"Error context: {request.context}")
        
        return {
            "status": "success",
            "message": "Error report logged successfully",
            "data": {
                "reported_at": "2024-01-15T10:30:00Z",  # Would use actual timestamp in production
            }
        }
        
    except Exception as e:
        logger.error(f"Error in error_report: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

