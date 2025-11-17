# System Overview

> Version: v1.0.0  
> Last updated: 2025-11-16 — Maintainer: @vzub (Chief Engineer)

## Mission
Patient Polish Tutor is evolving into a hybrid English↔Polish learning companion that blends a FastAPI backend, intelligent AI tutor, Murf-powered speech, and a modern web client to deliver adaptive lessons, grammar coaching, and natural audio feedback for busy learners.

## Architecture at a Glance
- **Frontend Experience**: React/Vite (or lightweight JS) app delivering chat, lesson dashboards, audio controls, and personalization settings.
- **Backend Services**: FastAPI 3.12 stack managing authentication, lessons, reviews, spaced repetition, and orchestration of downstream services.
- **AI Agent Layer**: Flowise/LangChain/OpenAI drivers wrapped by an Agent Orchestrator that handles prompts, memory, command routing, and tutor responses.
- **TTS & Audio Pipeline**: Murf AI for primary synthesis with queued workers, caching, and optional offline fallback.
- **Data & State**: PostgreSQL for durable records, Redis for hot session context, plus object storage/audio cache for generated media.

## Data Flow (One Paragraph)
Learners interact through the web client, which sends authenticated `/chat` or `/lesson` calls to FastAPI; the backend loads session context from Redis/PostgreSQL, invokes the Agent Orchestrator to craft prompts and call Flowise/OpenAI, logs results, and simultaneously enqueues Murf TTS jobs whose audio artifacts are cached and streamed back to the browser, completing a tightly looped learn→feedback→audio cycle with progress saved every turn.

## Technology Stack
- **Languages & Frameworks**: Python 3.12, FastAPI, React/Vite (or Vanilla JS build), Tailwind CSS.
- **AI & Speech**: Flowise/OpenAI (agent logic), Murf AI (primary TTS), optional pyttsx3 fallback.
- **Data Layer**: PostgreSQL 15, Redis 7, SQLAlchemy, Alembic migrations.
- **Infrastructure & Tooling**: Docker, Docker Compose, GitHub Actions, Prometheus, Grafana, Sentry, Logtail.
