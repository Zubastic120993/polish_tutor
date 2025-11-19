"""Main FastAPI application entry point."""

from dotenv import load_dotenv
from pathlib import Path

env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

import logging
from pathlib import Path

from fastapi import FastAPI, Request, WebSocket, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.middleware.cors import CORSMiddleware

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

# Phase D router
from src.api.routers.v2.user_progress import router as user_progress_router

# ADD THIS LINE - Phase B lesson router
from src.api.routers.v2.lessons import router as lesson_v2_router

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

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middlewares (order matters - first added = outermost)
app.add_middleware(MetricsMiddleware)
app.add_middleware(ExceptionLoggingMiddleware)
app.add_middleware(StructuredLoggingMiddleware)
app.add_middleware(RequestIDMiddleware)

# Create directories
static_audio_dir = BASE_DIR / "static" / "audio"
static_audio_dir.mkdir(parents=True, exist_ok=True)

audio_cache_dir = BASE_DIR / "audio_cache"
audio_cache_dir.mkdir(parents=True, exist_ok=True)

audio_cache_v2_dir = BASE_DIR / "static" / "audio_cache_v2"
audio_cache_v2_dir.mkdir(parents=True, exist_ok=True)

frontend_static_dir = BASE_DIR / "frontend" / "static"
frontend_static_dir.mkdir(parents=True, exist_ok=True)

templates = Jinja2Templates(directory=str(BASE_DIR / "frontend" / "templates"))

# Include routers BEFORE static mounts (important for route priority)
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
app.include_router(user_progress_router)
app.include_router(lesson_v2_router)  # ADD THIS LINE

# Static mounts (after routers to avoid conflicts)
app.mount("/static", StaticFiles(directory=frontend_static_dir), name="static")
app.mount("/audio_cache", StaticFiles(directory=audio_cache_dir), name="audio_cache")
app.mount(
    "/audio_cache_v2", StaticFiles(directory=audio_cache_v2_dir), name="audio_cache_v2"
)


# WebSocket
@app.websocket("/ws/chat")
async def websocket_endpoint(websocket: WebSocket):
    from src.api.routers.websocket import websocket_chat

    await websocket_chat(websocket)


# Error handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"Validation error: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "status": "error",
            "message": "Invalid request",
            "errors": exc.errors(),
            "data": None,
        },
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    if exc.status_code == 404:
        logger.info(f"404 Not Found: {request.url.path}")
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "status": "error",
                "message": f"Resource not found: {request.url.path}",
                "data": None,
            },
        )
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
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"status": "error", "message": "Internal server error", "data": None},
    )


# Health and info endpoints
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Patient Polish Tutor", "version": "0.1.0"}


@app.get("/api")
async def api_info():
    return {
        "message": "Patient Polish Tutor API",
        "docs": "/docs",
        "health": "/health",
        "metrics": "/metrics",
    }


@app.get("/metrics")
async def get_metrics():
    return await metrics_endpoint()


# Frontend routes (at the end)
@app.get("/")
async def root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/settings")
async def settings_page(request: Request):
    return templates.TemplateResponse("settings.html", {"request": request})


if __name__ == "__main__":
    import uvicorn

    host = config.get("host", "0.0.0.0")
    port = config.get("port", 8000)

    logger.info(f"Starting server on {host}:{port}")

    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=config.get("debug", False),
        log_level=config.get("log_level", "INFO").lower(),
    )
