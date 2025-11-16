# **Patient Polish Tutor — UI Redesign Roadmap (v2.0.0)**

*Last updated: 2025-11-14*  
*Purpose:* Define Phase 2 of the UI/lesson revamp so the app can transition from the v1 preview interface to a conversational, adaptive, CEFR-aligned tutor. The roadmap spans **React frontend**, **FastAPI backend**, and **SQLAlchemy/Alembic** layers.

[Read alongside `docs/redesign/gap-analysis.md`, which captures the current repo status.]

---

## Table of Contents
1. [Phase Options](#phase-options-execute-in-order)
2. [Current Status vs Roadmap](#current-status-vs-roadmap)
3. [Coexistence & Deployment Plan](#coexistence--deployment-plan)
4. [Shared Terminology](#shared-terminology)
5. [Recommended React Project Setup](#recommended-react-project-setup-phase-a)
6. [Cursor / Automation Notes](#cursor--automation-notes)
7. [Testing Strategy](#testing-strategy)
8. [Architecture Diagram](#architecture-topology)
9. [API Versioning & Routing](#api-versioning--routing)
10. [Security & Privacy Notes](#security--privacy-notes)
11. [UI State Machine](#ui-state-machine-applies-to-phase-a--beyond)
12. [Phase A](#a--react-component-implementation-v2000-alpha)
13. [Phase B](#b--backend-stt--evaluation-endpoints-v210)
14. [Phase C](#c--database-schema--migrations-v220)
15. [Phase D](#d--v2-ui-enhancements-v230)
16. [Testing & Versioning Notes](#testing--versioning-notes)
17. [Next Action](#next-action)

---

## Phase Options (Execute in Order)

1. **A — React Component Implementation** (v2.0.0-alpha)  
2. **B — Backend STT + Evaluation Endpoints** (v2.1.0)  
3. **C — Database Schema & Migrations** (v2.2.0)  
4. **D — v2 UI Enhancements** (v2.3.0)

> ⚠️ **Dependencies:** Implement phases **A → B → C → D**. Frontend requirements must drive backend APIs, which in turn dictate database models. Skipping the order risks incompatible contracts.

---

## Current Status vs Roadmap

| Area                                | Status | Notes                                                                                                                                            |
| ----------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Legacy frontend preview (Jinja)     | ✅     | `frontend/templates/dashboard.html` renders static tutor/learner bubbles and key-phrase playback. No chat UI or React architecture yet.          |
| TTS backend (`/api/audio/generate`) | ✅     | FastAPI + Murf engine return MP3 audio reliably for tutor and key phrases.                                                                       |
| Murf speech engine + caching        | ✅     | `src/services/speech_engine.py` handles TTS, caching, voice defaults, and error handling.                                                        |
| **A — React chat UI**               | ❌     | No React project, state machine, Tailwind configuration, or mock lesson provider.                                                                |
| **B — STT + evaluation endpoints**  | ❌     | Missing `POST /speech/recognize`, `POST /evaluate`, `GET /lesson/{id}/next`. No pronunciation scoring pipeline.                                  |
| **C — DB schema & migrations**      | ❌     | No `phrase_attempts`, `user_progress`, CEFR-tracking tables, or Alembic migrations for v2 schema.                                                |
| **D — v2 UI enhancements**          | ❌     | No scoring stars, retry animations, CEFR badges, adaptive hints, or summary dashboards.                                                          |

### Recommendation

Begin with **Phase A — React Component Implementation** to build the conversational UI skeleton. After the UI exists, proceed with backend evaluation logic (B), database extensions (C), and advanced UI states (D).

---

## Coexistence & Deployment Plan

* Legacy Jinja dashboard remains available for preview-only use during Phase A.
* React SPA lives under `frontend-react/` and is served at `/app/*` via FastAPI’s static mount (or separate dev server in development).
* Once React chat UI reaches parity, legacy templates can be retired.

---

## Shared Terminology

| Term | Definition |
| --- | --- |
| **SPA** | React application located in `frontend-react/`, served at `/app/*`. |
| **Legacy UI** | Existing Jinja-based dashboard (`frontend/templates/dashboard.html`). |
| **Phase A UI** | Chat-based React interface replacing the preview. |
| **Lesson Engine** | Backend state machine controlling phrase progression. |

---

## Recommended React Project Setup (Phase A)

* **Framework:** Vite + React + TypeScript + TailwindCSS  
* **Naming Conventions:**  
  * PascalCase for components/files (`TutorMessage.tsx`)  
  * camelCase for hooks (`useLessonState`)  
  * kebab-case for Tailwind utility classes

**Project Structure**

```
frontend-react/
  src/
    components/
      messages/
      controls/
      summaries/
    pages/
      LessonChatPage.tsx
      LessonSummaryPage.tsx
    hooks/
      useLessonState.ts
      useAudioQueue.ts
    state/
      machines/
      context/
    types/
    lib/
    assets/
```

---

## Cursor / Automation Notes

* Place all new UI code inside `frontend-react/`.
* Do **not** modify legacy Jinja templates during Phase A.
* Follow the state machine and API contracts defined below.

---

## Testing Strategy

* **Frontend:** React Testing Library + Vitest for components/state-machine behavior.  
* **Backend:** Pytest for STT/evaluation endpoints and scoring logic.  
* **Database:** Alembic migrations tested via pytest fixtures + SQLite/Postgres.  

---

## Architecture Topology

```mermaid
flowchart LR
    subgraph Frontend [React SPA (frontend-react)]
        ChatUI[LessonChatPage]
        MicButton
        KeyPhrases
    end
    subgraph Backend [FastAPI]
        APIv2[/api/v2/*/]
        Audio[/api/audio/generate/]
        STT[/api/v2/speech/recognize/]
        Eval[/api/v2/evaluate/]
        LessonNext[/api/v2/lesson/{id}/next/]
    end
    subgraph Services
        Murf[Murf TTS]
        Whisper[Whisper STT]
        LLM[LLM/Scoring]
    end
    subgraph Database
        Lessons[(lessons)]
        PhraseAttempts[(phrase_attempts)]
        UserProgress[(user_progress)]
        CachedAudio[(cached_audio)]
    end

    ChatUI -->|TTS requests| Audio
    ChatUI -->|Mic upload| STT
    ChatUI -->|Eval requests| Eval
    ChatUI -->|Next phrase| LessonNext
    Audio --> Murf
    STT --> Whisper
    Eval --> LLM
    APIv2 --> Lessons
    Eval --> PhraseAttempts
    LessonNext --> Lessons
    CachedAudio --> Audio
    PhraseAttempts --> UserProgress
```

---

## API Versioning & Routing

* All new endpoints introduced in Phases B–D belong under `/api/v2/...`.
* Existing legacy endpoints (`/api/lesson/...`, `/api/audio/generate`) remain for backward compatibility during the transition.
* Once the React UI fully replaces the preview, legacy `/api/v1` endpoints may be deprecated.

---

## Security & Privacy Notes

* STT and evaluation endpoints require authenticated users (same session auth currently used for lessons).
* Audio uploads should be stored in a private bucket or server path with signed URLs; ensure expiry on temporary assets.
* Avoid logging raw transcripts or audio contents; log only hashed IDs or anonymized aggregates.
* When connecting to external services (Murf, Whisper), ensure API keys are read from environment variables and rotated per ops policy.

---

## Non-Goals (v2 Scope)

* Grammar explanation content or textbook-like lessons (future content team deliverable).
* Mobile-native clients (React SPA is desktop-first; responsiveness is nice-to-have).
* Full personalization engine (beyond CEFR + difficulty tracking).
* Teacher/admin dashboards (remain on legacy UI until future phase).

---

## UI State Machine (applies to Phase A & beyond)

```
TUTOR_SPEAKING
  ↓
WAITING_FOR_USER
  ↓
RECORDING (mic active)
  ↓
EVALUATING
  ↓
FEEDBACK (success or retry)
  ↓
NEXT_PHRASE
  ↺ loops until lesson complete
```

All components must consume this machine to stay consistent.

---

## A — React Component Implementation (v2.0.0-alpha)

**Goal:** Build the conversational React UI that replaces the legacy preview interface.

### Deliverables

**Components**
* `LessonChatPage`, `LessonSummaryPage`
* `TutorMessage`, `UserMessage`, `FeedbackMessage`
* `TypingIndicator`
* `MicButton`, `PlayButton`
* `ProgressIndicator`, `ScoreBadge`
* `KeyPhrasesPanel`, `KeyPhraseRow`

**Technical**
* Tailwind utility classes, shared atoms, layout rules
* Mock lesson provider simulating:
  * tutor typing delay
  * mock scoring results
  * evaluation latency
* Audio + mic micro-interactions (play, recording latch, etc.)
* Auto-scroll and message transition effects

**State Management**
* Shared context + state machine (`useLessonState`, `useAudioQueue`)
* Deterministic mocks to unblock backend dependency

**Priority Order**
1. Core chat scaffold (`LessonChatPage`, state machine, auto-scroll)
2. Tutor/User/Feedback message components
3. Mic + playback controls
4. Key phrase drills + summary page

**Definition of Done**
* All components above implemented with mock data.
* State machine covers every path (success, retry, lesson complete).
* Unit tests cover message rendering + state transitions.
* React SPA builds and serves under `/app/*`.

---

## B — Backend STT + Evaluation Endpoints (v2.1.0)

**Goal:** Implement speech-to-text, pronunciation scoring, semantic evaluation, and next-phrase navigation.

### Endpoints (with sample contracts)

1. `POST /speech/recognize`
   * Request: audio blob (WebM/PCM)
   * Response:
     ```json
     {
       "transcript": "Cześć, poproszę kawę",
       "words": [
         {"word": "Cześć", "start": 0.12, "end": 0.48},
         {"word": "poproszę", "start": 0.52, "end": 1.21}
       ]
     }
     ```

2. `POST /evaluate`
   * Request:
     ```json
     {
       "phrase_id": "coffee_001_d1",
       "user_transcript": "Cześć poproszę kawę",
       "audio_url": "/uploads/temp123.webm"
     }
     ```
   * Response:
     ```json
     {
       "score": 0.92,
       "feedback": "Great! Emphasize the ł sound.",
       "hint": "Round lips for ł",
       "passed": true,
       "next_action": "advance"
     }
     ```

3. `GET /lesson/{id}/next`
   * Response:
     ```json
     {
       "lesson_id": "coffee_001",
       "current_index": 3,
       "total": 10,
       "tutor_phrase": "Świetnie! Co jeszcze?",
       "expected_phrases": ["To wszystko.", "Nic więcej."]
     }
     ```

### Infrastructure

* Pydantic schemas for requests/responses
* Integrated error handling + retry logic
* Mock mode when Whisper or evaluation services unavailable

### Logic

* Difficulty + mistake tracking
* Fallback scoring path when ML services fail

**Priority Order**
1. Implement `POST /speech/recognize` + Whisper integration.
2. Implement `POST /evaluate` with mock + real scoring pipeline.
3. Implement lesson navigation endpoint + state storage.
4. Harden error handling + mock mode toggles.

**Definition of Done**
* `POST /speech/recognize`, `POST /evaluate`, `GET /lesson/{id}/next` implemented under `/api/v2`.
* Endpoints covered by Pytest unit/integration tests.
* Mock mode available when Whisper/LLM unavailable.
* API contracts documented and consumed by React client.

---

## C — Database Schema & Migrations (v2.2.0)

**Goal:** Persist learner attempts, progress, and CEFR metrics.

### New SQLAlchemy Models

| Table            | Purpose                             |
| ---------------- | ----------------------------------- |
| `phrase_attempts`| Per-attempt scoring + timestamps    |
| `user_progress`  | Lesson completion, CEFR baseline    |
| `user_stats`     | Aggregated metrics (XP, streak)     |
| `daily_reviews`  | Spaced repetition scheduling        |
| `cached_audio`   | (Optional) track TTS file metadata  |

### Field Definitions

| Field             | Type   | Range  | Description                      |
| ----------------- | ------ | ------ | -------------------------------- |
| `score`           | float  | 0–1    | Overall correctness              |
| `phonetic_distance` | float | 0–1    | Pronunciation similarity         |
| `semantic_accuracy` | float | 0–1    | Meaning accuracy                 |
| `response_time`   | int    | ms     | Latency from prompt to response  |
| `timestamp`       | datetime | —     | Attempt time                     |
| `audio_ref`       | string | —      | Reference to stored audio blob   |

### CEFR Baseline

* CEFR level computed via weighted average of:
  * vocabulary mastery
  * pronunciation trend
  * grammar/semantic accuracy
* Update every N attempts (default 50) to reduce volatility.

### Migration Strategy

1. Add tables alongside existing ones (non-destructive).
2. Run Alembic migrations manually or on deploy.
3. Provide default CEFR values for existing users (e.g., A0).
4. Document rollback paths for each migration.

**Rollback Strategy**
* Each Alembic migration includes downgrade steps to remove added tables/columns.
* No destructive migrations during Phase C; data migrations should be reversible or have backup snapshots.

**Definition of Done**
* New tables created with migrations and reflected in SQLAlchemy models.
* Indexes verified for performance.
* Seed scripts or fixtures added for dev/testing.
* Migration test suite passes (upgrade + downgrade).

**Priority Order**
1. Create `phrase_attempts` and `user_progress` tables.
2. Add `user_stats` and `daily_reviews`.
3. Integrate CEFR metrics + indexing.
4. Optional `cached_audio` metadata.

---

## D — v2 UI Enhancements (v2.3.0)

**Goal:** Add advanced visual feedback, adaptive hints, and CEFR indicators on top of Phase A components.

### Enhancements

* **Visual Feedback**
  * Star ratings (⭐⭐⭐)
  * Score pulse animations
  * “Perfect!” / “Try again!” overlays
  * Shake animation on incorrect attempts
* **CEFR Progress**
  * XP bar
  * CEFR badges (A0 → A2)
  * Mini summary dashboard
* **Micro-Animations**
  * Typing indicator loop
  * Auto-scroll easing
  * Chat bubble fade/slide
  * Button press feedback
* **Key Phrase Upgrades**
  * Mic recording + evaluation per phrase
  * Scoring history
  * Adaptive hint bubble
  * Expand/collapse animation
* **Integration**
  * UI consumes backend scoring + hint metadata from Phase B

**Definition of Done**
* Advanced animations, scoring visuals, and CEFR indicators implemented and toggleable.
* Key phrase drills support mic + scoring history.
* Lesson summary displays CEFR/XP metrics correctly.
* UI regression tests updated to cover new states.

**Priority Order**
1. Scoring visuals + retry loop animations.
2. CEFR/XP dashboards.
3. Key phrase drill upgrades.
4. Adaptive hints + micro-interactions.

---

## Testing & Versioning Notes

* **Versions:**  
  * Phase A = `v2.0.0-alpha`  
  * Phase B = `v2.1.0`  
  * Phase C = `v2.2.0`  
  * Phase D = `v2.3.0`
* **Testing:**  
  * React Testing Library + Vitest for UI  
  * Pytest for backend routes/scoring  
  * Alembic migrations verified via fixtures

### Milestone Acceptance Criteria

Each phase must finish with:

1. Functional prototype or working endpoint(s).
2. Documentation updates (roadmap + gap analysis).
3. Automated tests covering new functionality.
4. Manual QA checklist or script.
5. Risk assessment notes (open issues, follow-ups).

---

## Next Action

Select **A**, **B**, **C**, or **D** to proceed—with the understanding that the execution order must remain **A → B → C → D**.

---

This roadmap is ready for GitHub documentation, internal planning, and Cursor-guided implementation.
