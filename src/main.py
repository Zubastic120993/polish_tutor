"""
Main FastAPI application entry point.
"""

import logging
from pathlib import Path
from dotenv import load_dotenv

from fastapi import FastAPI, Request, WebSocket, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.templating import Jinja2Templates

# -----------------------------
# Load environment
# -----------------------------
env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=env_path)

# -----------------------------
# Logging & Middleware
# -----------------------------
from src.core.app_context import app_context
from src.core.logging_config import setup_structured_logging
from src.core.middleware import (
    RequestIDMiddleware,
    StructuredLoggingMiddleware,
    ExceptionLoggingMiddleware,
)
from src.core.metrics import MetricsMiddleware, metrics_endpoint

logger = logging.getLogger(__name__)
BASE_DIR = Path(__file__).resolve().parents[1]

config = app_context.config
setup_structured_logging(
    log_dir="./logs",
    log_level=config.get("log_level", "INFO"),
    json_output=config.get("json_logging", True),
    console_output=config.get("console_logging", True),
)

# -----------------------------
# Create app
# -----------------------------
app = FastAPI(
    title="Patient Polish Tutor",
    description="AI-assisted conversational tutor for learning spoken Polish (A0 → A1)",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# -----------------------------
# CORS for Local Frontend
# -----------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# Middleware Stack
# -----------------------------
app.add_middleware(MetricsMiddleware)
app.add_middleware(ExceptionLoggingMiddleware)
app.add_middleware(StructuredLoggingMiddleware)
app.add_middleware(RequestIDMiddleware)

# -----------------------------
# Static Directories
# -----------------------------
static_audio_dir = BASE_DIR / "static" / "audio"
static_audio_dir.mkdir(parents=True, exist_ok=True)

audio_cache_dir = BASE_DIR / "audio_cache"
audio_cache_dir.mkdir(parents=True, exist_ok=True)

audio_cache_v2_dir = BASE_DIR / "static" / "audio_cache_v2"
audio_cache_v2_dir.mkdir(parents=True, exist_ok=True)

frontend_static_dir = BASE_DIR / "frontend" / "static"
frontend_static_dir.mkdir(parents=True, exist_ok=True)

templates = Jinja2Templates(directory=str(BASE_DIR / "frontend" / "templates"))


@app.get("/audio_cache_v2/{filename:path}")
async def serve_audio_cache_v2(filename: str):
    file_path = (audio_cache_v2_dir / filename).resolve()
    base_dir = audio_cache_v2_dir.resolve()
    if not str(file_path).startswith(str(base_dir)) or not file_path.exists():
        return JSONResponse(status_code=404, content={"detail": "Audio not found"})
    return FileResponse(file_path, media_type="audio/mpeg")


app.mount("/static", StaticFiles(directory=frontend_static_dir), name="static")
app.mount("/audio_cache", StaticFiles(directory=audio_cache_dir), name="audio_cache")
app.mount(
    "/audio_cache_v2", StaticFiles(directory=audio_cache_v2_dir), name="audio_cache_v2"
)

# -----------------------------
# Routers (V1)
# -----------------------------
from src.api.routers import (
    auth,
    chat,
    lesson,
    review,
    settings,
    user,
    audio,
    backup,
    error,
)

app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(lesson.router)
app.include_router(review.router)
app.include_router(settings.router)
app.include_router(user.router)
app.include_router(audio.router)
app.include_router(backup.router)
app.include_router(error.router)

# -----------------------------
# Routers (V2)
# -----------------------------
from src.api.routers import api_v2_router

app.include_router(api_v2_router)


# -----------------------------
# Websocket
# -----------------------------
@app.websocket("/ws/chat")
async def websocket_endpoint(websocket: WebSocket):
    from src.api.routers.websocket import websocket_chat

    await websocket_chat(websocket)


# -----------------------------
# Exception Handlers
# -----------------------------
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=400,
        content={"status": "error", "message": str(exc.errors()), "data": None},
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    if exc.status_code == 404:
        return JSONResponse(
            status_code=404,
            content={"status": "error", "message": f"Not found: {request.url.path}"},
        )
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


# -----------------------------
# Health
# -----------------------------
@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# -----------------------------
# Root HTML
# -----------------------------
@app.get("/")
async def root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


# -----------------------------
# Run with uvicorn
# -----------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("src.main:app", host="0.0.0.0", port=8000, reload=True)
