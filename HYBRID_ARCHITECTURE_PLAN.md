# Hybrid Architecture Plan

> Version: v1.0.1  
> Last updated: 2025-11-16  
> Status: Approved — Hybrid Architecture Rollout Phase 1 (Kickoff)
> Maintainer: @vzub
## Current Architecture Audit

### Backend & API
- `main.py:22-160` bootstraps FastAPI, wires every router, mounts static assets, and hosts the WebSocket endpoint directly; the file is doing app config, infra setup, and presentation routing simultaneously.
- REST routers under `src/api/routers/` (e.g., `chat.py:1-63`, `lesson.py:1-144`, `user.py`, `settings.py`) expose business logic but rely on the global `app_context`, so routing, dependency injection, and orchestration are tightly coupled.
- Error handling, backup, and audio endpoints live beside core lesson/chat endpoints, making it hard to separate “public API” from internal utilities.

### Lesson / Data Layer
- `src/core/lesson_manager.py:1-200` loads and validates JSON lessons in `data/lessons/`, caches them in memory, and even saves them into the relational DB—logic that should move behind a repository/service boundary.
- `data/lessons/catalog.json` and `sessions/` contain content snapshots that the frontend reads directly today, bypassing the API.

### AI / Feedback / TTS
- `src/core/tutor.py:22-200` orchestrates everything: intent detection (OpenAI), lesson branching, scoring, SRS writes, audio lookups, dynamic lesson generation, and database logging. This will become the Agent layer’s responsibility but currently lives inside the backend process.
- AI lesson generation already exists via `src/services/lesson_generator.py:1-170` (OpenAI → fallback templates). Flowise/LangChain hooks can reuse this abstraction.
- TTS is handled by `src/services/speech_engine.py:1-200`, which chains GPT-4-TTS, ElevenLabs, gTTS, Coqui, and pyttsx3. Swapping in Murf AI will require a new adapter plus caching logic.
- Feedback, SRS, and speech services (`src/services/*.py`) are Python classes without clear async boundaries or dependency injection, so they’ll need to be reorganized under backend services vs. agent services.

### Persistence
- `src/core/database.py:1-45`, `src/services/database_service.py:1-140`, and SQLAlchemy models in `src/models/*.py` (`User`, `Lesson`, `LessonProgress`, `Attempt`, `Setting`, `SRSMemory`, etc.) already cover most data needs, but session/log tables for the agent don’t exist yet.
- Alembic migrations live in `migrations/`, and `env.template` documents current env vars (OpenAI, ElevenLabs, database). We’ll extend this for Murf, Flowise endpoints, and frontend secrets.

### Frontend
- The UI is a monolithic static app in `static/index.html:1` with Tailwind-built CSS under `static/css/` and large imperative controllers such as `static/js/chat.js:6-200`, `lesson.js`, `audio.js`, etc. State (user id, lesson progress, translations) is all client-side, and content is fetched via `/api/*` plus WebSockets.
- No build tooling is enforced even though `node_modules/`, `tailwind.config.js`, and `postcss.config.js` exist; moving to a dedicated `frontend/` package will simplify bundling and templating.

## Mapping to Hybrid Layers

| Layer | Existing Assets | Action |
| --- | --- | --- |
| **Backend (FastAPI)** | `main.py`, `src/api/routers/*`, `src/core/database.py`, `src/models/*`, `src/services/database_service.py` | Move into `backend/app/`. Split routers into public APIs (`/chat`, `/lesson`, `/tts`, `/user`) vs. internal admin ops. Extract config, logging, and DI into `backend/app/core/`. |
| **Agent Layer (OpenAI / Flowise / LangChain)** | Logic inside `src/core/tutor.py`, `LessonGenerator`, `FeedbackEngine`, `SpeechEngine`, SRS tasks | Create `backend/ai_agent/` hosting an `AgentOrchestrator` (conversation), `AgentClient` (Flowise/LangChain driver), `PolicyManager` (grammar, commands), and `SessionManager` (per-user state). Tutor class becomes a thin wrapper over these components. |
| **TTS / Audio Service** | `SpeechEngine` plus `/static/audio` mount | Move to `backend/tts/` with Murf-specific `MurfClient`, caching pipeline, and job queue (Celery/RQ optional). Frontend will call `/api/tts/speak`. |
| **Frontend** | `static/` HTML/JS | Relocate to `frontend/` (templates, static assets, build scripts). Serve via FastAPI `JinjaTemplates` or a separate static host, but all API calls hit FastAPI. |
| **Database / Storage** | SQLAlchemy models | Keep models under `backend/app/db/models/`. Add new tables: `AgentSession`, `AgentTurn`, `AudioJob`, `LessonAssignment`. Configure separate schemas for content vs. telemetry if PostgreSQL is adopted. |
| **Config & Operations** | `env.template`, scattered constants | Centralize in `config/` (`settings.py`, `.env.example`, `logging.yaml`, `alembic.ini`). Provide `scripts/` for migrations, seeding lessons, syncing Murf voices. |

## Proposed Folder Structure

```text
backend/
  app.py
  core/
    config.py
    logging.py
    dependencies.py
  api/
    routers/
      chat.py
      lesson.py
      tts.py
      user.py
      review.py
    schemas/
      chat.py
      lesson.py
      tts.py
  db/
    models/
    repositories/
    migrations/  (symlink or move from root)
    seed/
  services/
    lesson/
    review/
    progress/
  ai_agent/
    orchestrator.py
    agent_client.py
    session_manager.py
    prompts/
  tts/
    murf_client.py
    audio_cache.py
    tasks.py
  websocket/
    chat.py
frontend/
  templates/
    base.html
    dashboard.html
  static/
    css/
    js/
    audio/
  src/
    components/
    services/api.js
config/
  settings.example.json
  .env.example
  gunicorn.conf.py
scripts/
  seed_lessons.py
  sync_murf_voices.py
docs/
  UX_ROADMAP.md
  TTS_SETUP.md
```

New items worth highlighting: `ai_agent/session_manager.py`, `ai_agent/prompts/lesson_reflection.md`, `tts/murf_client.py`, `services/progress/session_manager.py`, `frontend/src/services/agentClient.ts`.

## Architecture Alignment

- Detailed sequence diagram for the AI → DB → TTS pipeline now lives in `ARCHITECTURE.md`.
- All network/database calls should use async implementations (`httpx`, `asyncpg`, `aioredis`, async SQLAlchemy) so the FastAPI worker stays non-blocking.
- The Agent layer exposes a driver interface under `ai_agent/drivers/` so we can switch between Flowise, LangChain, or raw OpenAI without touching orchestration logic.
- Session state is cached in Redis, summarized periodically, and persisted asynchronously to PostgreSQL to avoid heavy write amplification.
- TTS execution is decoupled through RQ workers that call Murf, write hashed artifacts into the audio cache, and notify the API when audio is ready.
- Auth will move to a JWT flow (access + refresh) with rotation and middleware that injects `current_user` into every route.

## Platform Improvement Tracker

| Area | Issue | Recommendation |
| --- | --- | --- |
| Orchestration flow | No explicit pipeline linking AI → DB → TTS | Keep the new sequence diagram in `ARCHITECTURE.md` and update it alongside code changes. |
| Async consistency | Mixed sync/async | Migrate repositories, HTTP clients, and queue calls to async primitives; enforce via lint/tests. |
| Agent abstraction | Coupled to Flowise/OpenAI | Implement `AgentDriverProtocol` with adapters for Flowise, LangChain, OpenAI. Configure via DI. |
| Session scalability | Heavy DB writes | Add Redis caching + transcript summarization jobs; batch DB writes. |
| TTS | No queue resilience | Introduce RQ worker pool, Murf adapter, deduped cache hashing, retry/backoff policy. |
| Auth | JWT not detailed | Ship full auth flow (register/login/refresh/logout), store refresh tokens, protect `/chat`, `/tts`, `/lesson/generate`. |
| Deployment | Missing pipeline | Provide Docker Compose for local stack and GitHub Actions workflow (lint, test, build, deploy). |
| Monitoring | None | Integrate Prometheus metrics, Grafana dashboards, Sentry error tracking. |
| Prompt management | Static | Store prompts as YAML with version tags, include hash in agent responses for reproducibility. |

## Migration Checklist

- **API Endpoints**
  - `/chat/respond` → convert to `/chat` POST (REST) and `/chat/stream` (WebSocket/SSE). Ensure payload includes `session_id`, `turn_context`, `tts_preference`.
  - `/lesson/catalog`, `/lesson/get`, `/lesson/options`, `/lesson/generate` stay but move under `backend/app/api/routers/lesson.py`.
  - Introduce `/tts/speak` (async job returning audio_id), `/tts/status/{id}` to poll Murf rendering, and `/tts/voices`.
  - `/user` endpoints should cover CRUD plus `/user/{id}/progress`, `/user/login` (even if stubbed).
  - `/agent/session` to create/resume chat contexts and `/agent/history/{session_id}` for transcripts.
- **Database Models**
  - Review existing SQLAlchemy models for naming consistency; move to `backend/app/db/models`.
  - Add `AgentSession` (user_id, lesson_id, agent_profile, active_dialogue_id, state blob), `AgentTurn` (session_id, speaker, text, score, audio_url), `AudioJob` (tts_provider, status, url, checksum), `LessonAssignment` (user_id, lesson_id, status, due_at), `UserPreference` (translation_mode, tts_voice, murf_voice_id).
  - Normalize `Lesson`/`Phrase` tables or keep JSON but store metadata rows for search.
- **Agent Integration**
  - Implement `AgentClient` to call Flowise/LangChain or OpenAI completions; include retry/backoff, guardrails, and telemetry.
  - Define prompt templates under `backend/ai_agent/prompts/` (grammar correction, conversational tutoring, command detection).
  - Build `SessionManager` to hydrate context from DB/cache, merge with user settings, and feed the agent each turn.
- **TTS (Murf)**
  - Create `tts/murf_client.py` handling OAuth/API key auth, voice selection, synthesis requests, and polling.
  - Extend audio cache to tag provider + checksum; enforce TTL and cleanup job.
  - Update `static/audio` usage so frontend always loads from `/api/tts/audio/{audio_id}` rather than static disk.
- **Environment Variables / Config**
  - `.env` should include `DATABASE_URL`, `REDIS_URL` (for queues), `OPENAI_API_KEY`, `FLOWISE_URL`, `FLOWISE_API_KEY`, `MURF_API_KEY`, `MURF_VOICE_ID`, `FRONTEND_URL`, `CORS_ALLOWLIST`, `JWT_SECRET`.
  - Provide `config/settings.py` with `pydantic.BaseSettings` to read envs once per process.
- **Security & Ops**
  - Tighten CORS to environment-driven allowlist.
  - Add API key / JWT auth to `/chat`, `/tts`, `/lesson/generate`.
  - Store secrets in `.env` + production vault, not in code.
  - Implement request/response logging middleware with PII scrubbing.
  - Rate-limit `/chat` and `/tts` endpoints using e.g. `slowapi`.
  - Ensure Murf/OpenAI keys never leak to frontend.

## Step-by-Step Rebuild Plan

1. **Extract Config & Bootstrap**
   - Move `main.py` internals into `backend/app.py` + `backend/core/config.py`.
   - Set up `pydantic` settings, logging config, and dependency injection modules.
2. **Restructure Database Layer**
   - Relocate models and repositories under `backend/db/`.
   - Create migrations for new tables (`AgentSession`, `AgentTurn`, `AudioJob`, etc.).
   - Add repository classes for lessons, attempts, and audio jobs.
3. **Modularize Tutor → Agent Layer**
   - Split `src/core/tutor.py` into `AgentOrchestrator`, `FeedbackService`, `SessionManager`.
   - Implement Flowise/LangChain client plus prompt templates.
   - Wire the orchestrator through FastAPI dependencies.
4. **Introduce Dedicated TTS Service**
   - Build `tts/murf_client.py` + cache manager.
   - Expose `/tts` endpoints and update existing audio router to delegate to Murf.
   - Migrate audio cache directories into `backend/tts/` with hashed filenames.
5. **Frontend Separation**
   - Copy `static/` into `frontend/`, set up build pipeline (Vite/Rollup or keep vanilla).
   - Replace direct static serving with template rendering or CDN deploy; update API calls to new endpoints.
   - Implement lightweight state modules (e.g., `frontend/src/services/sessionStore.ts`) rather than huge monolith scripts.
6. **Session & Progress Management**
   - Create `SessionManager` class controlling conversation state, lesson pointers, and SRS scheduling.
   - Update `/chat` and `/lesson` routers to require `session_id` and persist progress after each turn.
7. **Observability & Security**
   - Add middleware for tracing, structured logs, and error envelopes.
   - Configure auth (JWT or API key) for all API routes.
   - Document environment, secrets, and deployment steps in `config/`.
8. **QA & Documentation**
   - Update `README.md`, `UX_ROADMAP.md`, `TTS_SETUP.md` with new architecture diagrams and endpoints.
   - Refresh `env.template` → `.env.example`.
   - Add unit/integration tests covering new services.

## Deprecated / To Remove

- `main.py` static serving and WebSocket logic → replaced by `backend/app.py` and `backend/websocket/chat.py`.
- Legacy TTS fallbacks in `src/services/speech_engine.py` once Murf is live; keep only as emergency option.
- Direct lesson JSON fetches from frontend (e.g., `static/js/chat.js` calling `/api/lesson/catalog`) should move to a typed API service module; remove unused scripts like `static/js/websocket_client_example.js`.
- Old `sessions/` snapshots once DB-backed session tracking is implemented.
- Redundant CSS/JS builds in `static/` after frontend pipeline moves to `frontend/`.

## Modular Improvement Suggestions

- **SessionManager class**: introduce `backend/ai_agent/session_manager.py` to load/save user context, throttle command suggestions, and mediate agent memory instead of keeping dicts inside `Tutor`.
- **Stateful repositories**: replace `DatabaseService` catch-all with scoped repositories (UserRepository, LessonRepository, ProgressRepository) to clarify responsibilities.
- **Event-driven TTS queue**: wrap Murf jobs in a background worker (RQ/Celery) so `/tts/speak` returns immediately and frontend polls status.
- **Agent policy configuration**: store prompt snippets and command configs in YAML (`ai_agent/prompts/commands.yaml`) to iterate without code changes.
- **Frontend service layer**: add `frontend/src/services/apiClient.ts` and `sessionStore.ts` to centralize fetch logic, WebSocket handling, and audio playback hooks.

When ready, start implementing the new structure incrementally: begin with config/db moves, then carve out the agent and TTS services, and finally modernize the frontend plus deployment scripts.

## Completion Checklist (Future-Proofing)

### Core Backend
- Dependency injection container or service registry
- Global configuration loader with environment validation
- Trace ID propagation across APIs and workers
- Structured error-handling middleware returning JSON envelopes
- Centralized logging formatter (JSON output, level filters, rotation)

### AI Agent Layer
- Memory summarization for short-term vs. long-term context
- Context compression (token budgeting, key-phrase extraction)
- Prompt version registry (YAML metadata with hash + version)
- Response evaluator capturing scores/confidence for analytics
- Offline fallback path when Flowise/OpenAI are unavailable

### TTS / Audio
- Murf API retry/timeout policy
- Offline fallback engine (pyttsx3 or equivalent)
- Scheduled cleanup of cached audio artifacts
- Voice configuration management (catalog, defaults, per-user overrides)
- Pre-render queue for frequently used phrases

### Database & Caching
- Async connection pools with graceful startup/shutdown hooks
- Repository-level unit tests per table
- Redis schema/key-naming documentation
- Background jobs for transcript summarization and cleanup
- Data versioning plus migration rollback strategy

### Auth & User Management
- Password reset + email verification endpoints
- Rate limiting and account lockout rules
- Role-based permissions (admin vs. learner)
- Token blacklist/revocation when users log out
- GDPR/privacy policy placeholders for production readiness

### Frontend
- Unified API client wrapper with auto token refresh
- Central state store (session, progress, audio queue)
- Robust error/loading indicators for chat and TTS flows
- Local audio caching for offline playback
- Lesson progress visualizations (XP, streaks, badges)
- Language switcher and theme toggle

### Testing
- Unit coverage for all services/repositories
- Integration suites for `/chat`, `/lesson`, `/tts`
- Load tests to validate async concurrency
- Frontend E2E runs via Playwright/Cypress
- Mock servers for LLM and TTS dependencies

### DevOps / Deployment
- Dockerfiles per component (backend, frontend, worker)
- `docker-compose.yml` bundling Redis + PostgreSQL
- GitHub Actions pipeline (lint → test → build → deploy)
- Environment matrix definitions (dev, staging, prod)
- Monitoring stack (Prometheus, Grafana, Sentry, Logtail)
- Backup/restore scripts for DB and lesson data

### Documentation
- `ARCHITECTURE.md` with flows and diagrams
- `API_REFERENCE.md` covering endpoints and payloads
- `DEPLOYMENT_GUIDE.md` for Docker + CI/CD steps
- `PROMPT_CATALOG.md` enumerating AI prompt templates/versions
- `DATA_MODEL.md` with ER diagrams and relationships
- `CONTRIBUTING.md` explaining branching, coding standards, pre-commit hooks

### Optional Enhancements
- WebSocket-powered live pronunciation feedback
- Analytics dashboard (lesson usage, agent accuracy, TTS latency)
- Feature flag service for experimenting with new models
- Localization system for UI copy
- Plugin interface for injecting new lesson modules or content packs

## Final Suggestions for Implementation Phase

1. **Linkage & Execution**
   - Mirror every checklist item into `PROGRESS.md`/`ROADMAP.md` with assignee + deadline, and optionally sync to GitHub Issues or Projects for automated tracking.
2. **Architecture Governance**
   - Add version headers (`# Architecture v1.0.0`) to major docs and maintain a Semantic Versioned `CHANGELOG.md` for backend, frontend, and prompt assets.
3. **Onboarding & Local Setup**
   - Provide a single-command bootstrap (`make setup` or `scripts/setup_local.sh`) that installs dependencies, seeds the DB, and starts dev containers; document required Python/Node versions.
4. **Quality Gates**
   - Configure pre-commit hooks (black, isort, mypy, eslint, prettier) plus CI coverage thresholds (≥80%) to keep regressions out.
5. **Release Process**
   - Tag milestones (v1.0.0-alpha/beta) and attach Docker image build artifacts in GitHub Actions for reproducible releases.
6. **Security & Privacy**
   - Schedule secret rotation for API/JWT keys, add an audit-log table for sensitive actions, and expose a stub endpoint/workflow for GDPR deletion requests.
7. **UX & Learning Analytics**
   - Implement event logging for key user interactions (lesson completion, pronunciation replay) and expose an aggregated analytics endpoint for dashboards.
8. **Maintenance Policy**
   - Define routine maintenance: weekly DB backups, monthly dependency bumps, quarterly code/infra audits.

**Next Step:** create or update `PROGRESS.md` so each completion-checklist item above becomes a trackable task, enabling the team to move from planning to execution with clear ownership.
