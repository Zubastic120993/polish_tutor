"""Main FastAPI application entry point."""
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from src.core.app_context import app_context
from src.core.logging_config import setup_logging

# Set up logging
config = app_context.config
setup_logging(log_dir="./logs", log_level=config.get("log_level", "INFO"))

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

# Set up static file serving for audio
static_audio_dir = Path("./static/audio")
static_audio_dir.mkdir(parents=True, exist_ok=True)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "Patient Polish Tutor",
        "version": "0.1.0"
    }


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Patient Polish Tutor API",
        "docs": "/docs",
        "health": "/health"
    }


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

