"""Main FastAPI application entry point."""

from dotenv import load_dotenv
from pathlib import Path

env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)


import logging
from pathlib import Path

from fastapi import FastAPI, Request, WebSocket, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.exceptions import HTTPException as StarletteHTTPException

from src.api.routers import (
    api_v2_router,
    audio,
    auth,
    backup,
    chat,
    error,
    lesson,
    review,
    settings,
    user,
)
from src.core.app_context import app_context
from src.core.logging_config import setup_structured_logging
from src.core.middleware import (
    RequestIDMiddleware,
    StructuredLoggingMiddleware,
    ExceptionLoggingMiddleware,
)
from src.core.metrics import MetricsMiddleware, metrics_endpoint

logger = logging.getLogger(__name__)
BASE_DIR = Path(__file__).resolve().parent

# Set up structured logging
config = app_context.config
json_logging = config.get("json_logging", True)
console_logging = config.get("console_logging", True)
setup_structured_logging(
    log_dir="./logs",
    log_level=config.get("log_level", "INFO"),
    json_output=json_logging,
    console_output=console_logging,
)

# Create FastAPI app
app = FastAPI(
    title="Patient Polish Tutor",
    description="AI-assisted conversational tutor for learning spoken Polish (A0 → A1 level)",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS - localhost only for Phase 1
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:3000",  # For potential frontend dev server
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add middleware
app.add_middleware(MetricsMiddleware)
app.add_middleware(ExceptionLoggingMiddleware)
app.add_middleware(StructuredLoggingMiddleware)
app.add_middleware(RequestIDMiddleware)

# Set up static file serving for audio
static_audio_dir = BASE_DIR / "static" / "audio"
static_audio_dir.mkdir(parents=True, exist_ok=True)

# Set up audio cache directory
audio_cache_dir = BASE_DIR / "audio_cache"
audio_cache_dir.mkdir(parents=True, exist_ok=True)

# Set up frontend static files
frontend_static_dir = BASE_DIR / "frontend" / "static"
frontend_static_dir.mkdir(parents=True, exist_ok=True)

# Set up Jinja2 templates
templates = Jinja2Templates(directory=str(BASE_DIR / "frontend" / "templates"))

# Mount static files
app.mount("/static", StaticFiles(directory=frontend_static_dir), name="static")
app.mount("/audio_cache", StaticFiles(directory=audio_cache_dir), name="audio_cache")

# Include routers
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(lesson.router)
app.include_router(review.router)
app.include_router(settings.router)
app.include_router(user.router)
app.include_router(audio.router)
app.include_router(backup.router)
app.include_router(error.router)
app.include_router(api_v2_router)


# WebSocket endpoint
@app.websocket("/ws/chat")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time chat."""
    from src.api.routers.websocket import websocket_chat

    await websocket_chat(websocket)


# Error handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors (400 Bad Request)."""
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "status": "error",
            "message": "Invalid request: " + str(exc.errors()),
            "data": None,
        },
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle HTTP exceptions (404, etc.)."""
    if exc.status_code == 404:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "status": "error",
                "message": f"Resource not found: {request.url.path}",
                "data": None,
            },
        )
    # For other HTTP exceptions, return the default response
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "message": exc.detail if hasattr(exc, "detail") else "An error occurred",
            "data": None,
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unhandled exceptions (500 Internal Server Error)."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"status": "error", "message": "Internal server error", "data": None},
    )


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "Patient Polish Tutor", "version": "0.1.0"}


@app.get("/")
async def root(request: Request):
    """Root endpoint - serve interactive tutor shell."""
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/settings")
async def settings_page(request: Request):
    """Serve tutor settings UI."""
    return templates.TemplateResponse("settings.html", {"request": request})


@app.get("/api")
async def api_info():
    """API information endpoint."""
    return {
        "message": "Patient Polish Tutor API",
        "docs": "/docs",
        "health": "/health",
        "metrics": "/metrics",
    }


@app.get("/metrics")
async def get_metrics():
    """Prometheus metrics endpoint."""
    return await metrics_endpoint()


if __name__ == "__main__":
    import uvicorn

    host = config.get("host", "0.0.0.0")
    port = config.get("port", 8000)

    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=config.get("debug", False),
        log_level=config.get("log_level", "INFO").lower(),
    )
