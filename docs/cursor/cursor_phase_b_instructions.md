# **Patient Polish Tutor — Phase B Backend Instructions (v3.0.0)**

*This file documents the completed Phase B backend stack. Cursor agents must preserve this behavior when extending the system.*

---

# 🎯 **Purpose**

Phase B delivers the **production-ready backend speech pipeline**, including:

* 🔊 OpenAI Whisper STT endpoint accepting Base64 uploads
* 🧠 LLM-driven pronunciation + semantic evaluation with persistence
* 👉 Lesson manifest + progression endpoints with cached Murf audio
* 🗂️ v2 schemas/services/models wired into the SQLite/Postgres DB

Frontend (React) is already shipped. Cursor must keep the React bundle untouched unless explicitly told otherwise.

---

# 🏛️ **Where Cursor May Work**

Cursor may only modify or add files under:

```
src/api/routers/v2/
src/schemas/v2/
src/services/
src/models/v2/
static/audio_cache_v2/
```

Use existing helpers inside `src/core/` (database session, config). Do not touch `frontend-react/`, `frontend/templates/`, or legacy routers.

---

# 📌 **Backend Status Overview**

* `/api/v2/speech/recognize` is backed by **`WhisperSTTService`** calling OpenAI `gpt-4o-transcribe`. Payload is JSON with a Base64 WAV blob. Responses include the transcript and per-word timestamps.
* `/api/v2/evaluate` runs **`EvaluationService`** (OpenAI `gpt-4o-mini`) plus `LessonFlowService` and `ProgressTracker`. Every call persists a `PhraseAttempt`, updates `UserProgress`, bumps `UserStats`, and schedules a `DailyReview` row when the learner passes.
* `/api/v2/lesson/{lesson_id}` and `/lesson/{lesson_id}/next` expose mock lessons via `LessonFlowService`. Audio files are ensured via `SpeechEngine`, which can reuse pre-recorded clips or synthesize via Murf and cache the result in `static/audio_cache_v2`.
* Models defined in `src/models/v2/` already have Alembic migration `13479edb7ec9`. Use `SessionLocal` from `src.core.database` for writes.

Cursor must extend—not rewrite—this stack. Keep caching directories and DB schema compatible with the existing services.

---

# 🔌 **API Endpoints (current contract)**

## 1. **POST /api/v2/speech/recognize**

*Input JSON*
```json
{
  "audio_base64": "UklGRtQAAABXQVZFZm10IBAAAAABAAEA..."
}
```

*Response*
```json
{
  "transcript": "Cześć, poproszę kawę",
  "words": [
    {"word": "Cześć", "start": 0.00, "end": 0.42},
    {"word": "poproszę", "start": 0.45, "end": 1.12}
  ]
}
```

*Behavior*

1. Validate payload contains Base64 audio (WAV/WebM). Bad payload → `400`.
2. `WhisperSTTService` decodes into a temp WAV, calls OpenAI `audio.transcriptions.create` with `model = STT_ENGINE (default gpt-4o-transcribe)` and `timestamp_granularities=["word"]`.
3. Convert the OpenAI response into `SpeechRecognitionResponse` (transcript + `WordTiming[]`).
4. Clean up temp file even on failure. Missing API key → `500`.

## 2. **POST /api/v2/evaluate**

*Request*
```json
{
  "phrase_id": "p2",
  "user_transcript": "Jak się masz?",
  "audio_url": "/uploads/tmp123.webm"
}
```

*Response*
```json
{
  "score": 0.82,
  "feedback": "Meaning is correct, watch the soft ś sound.",
  "hint": "Jest blisko! Zwróć uwagę na akcent i płynność.",
  "passed": true,
  "next_action": "advance"
}
```

*Behavior*

1. Validate `phrase_id` and `user_transcript` are non-empty.
2. `LessonFlowService.find_phrase` locates the lesson, index, and canonical text. Missing IDs → `404`.
3. `EvaluationService.evaluate` streams the request through the LLM:
   * Uses OpenAI `gpt-4o-mini` chat completions with strict JSON output.
   * Computes semantic accuracy, clamps to `[0, 1]`, decides pass threshold `>= 0.75`.
   * Builds user-friendly `feedback` + `hint`; `next_action` is `advance` only when passed.
4. `ProgressTracker.record_evaluation` persists:
   * Inserts `PhraseAttempt` (score, phonetic_distance, semantic_accuracy, transcript, optional audio ref).
   * Upserts `UserProgress` for the lesson and increments stats via `StatsManager`.
   * Enqueues/refreshes a `DailyReview` entry for passed phrases.
5. Any DB failure raises `500` after logging.

## 3. **GET /api/v2/lesson/{lesson_id}` + `/lesson/{lesson_id}/next?index=0`**

*Manifest Response*
```json
{
  "lesson_id": "lesson_mock_001",
  "phrases": [
    {"id": "p1", "pl": "Cześć!", "en": "Hi!"},
    {"id": "p2", "pl": "Jak się masz?", "en": "How are you?"}
  ]
}
```

*Next Phrase Response*
```json
{
  "lesson_id": "lesson_mock_001",
  "current_index": 1,
  "total": 3,
  "tutor_phrase": "Jak się masz?",
  "expected_phrases": ["Jak się masz?"],
  "audio_url": "/audio_cache_v2/p2.mp3"
}
```

*Behavior*

1. `LessonFlowService` serves phrases from the in-memory lesson map (Phase C swaps this for DB).
2. `/next` ensures an audio file exists:
   * If API returned an `audio_url`, rewrite it so the frontend downloads from `/audio_cache_v2`.
   * Otherwise call `_ensure_phrase_audio`, which:
     - Checks `static/audio_cache_v2/{phrase_id}.mp3`.
     - Uses `SpeechEngine.get_audio_path` to pull from pre-recorded assets or synthesize via Murf (`MURF_API_KEY`).
     - Copies new files into the cache and creates empty placeholders when synthesis fails.
3. Bad lesson or index → `404` / `400` respectively.

---

# 🧠 **Service Responsibilities**

| Service | Path | Purpose |
| --- | --- | --- |
| `WhisperSTTService` | `src/services/whisper_stt.py` | Base64 decoding, temp-file safety, OpenAI STT call, timestamp normalization. |
| `EvaluationService` | `src/services/evaluator.py` | gpt-4o-mini semantic scoring with JSON extraction + friendly hints. |
| `SpeechEngine` | `src/services/speech_engine.py` | Murf TTS wrapper with cache keying + pre-recorded fallbacks. |
| `LessonFlowService` | `src/services/lesson_flow.py` | Mock lesson data + lookup helpers for phrase metadata. |
| `ProgressTracker` | `src/services/progress_tracker.py` | Persists attempts, updates `UserProgress`, `UserStats`, and `DailyReview`. |
| `StatsManager` | `src/services/stats_manager.py` | Computes XP/streak deltas whenever attempts are saved. |

All interactions must use these services—do not bypass them with ad-hoc SQL or API calls.

---

# 🧪 **Schema Reference (Pydantic)**

```python
class SpeechRecognitionRequest(BaseModel):
    audio_base64: str

class SpeechRecognitionResponse(BaseModel):
    transcript: str
    words: List[WordTiming]

class EvaluateRequest(BaseModel):
    phrase_id: str
    user_transcript: str
    audio_url: Optional[str] = None

class EvaluateResponse(BaseModel):
    score: float
    feedback: str
    hint: str
    passed: bool
    next_action: Literal["advance", "retry"]

class LessonMetaResponse(BaseModel):
    lesson_id: str
    phrases: List[LessonPhraseMeta]

class LessonNextResponse(BaseModel):
    lesson_id: str
    current_index: int
    total: int
    tutor_phrase: str
    expected_phrases: List[str]
    audio_url: str | None
```

> `WordTiming` always contains `word`, `start`, `end`. Include at least one entry even if timestamps are missing by reusing the whole transcript.

---

# ⚙️ **Environment & Config**

* `OPENAI_API_KEY` – required for both STT and evaluation.
* `STT_ENGINE` – overrides the Whisper model (default `gpt-4o-transcribe`).
* `MURF_API_KEY`, `MURF_VOICE_ID`, `MURF_VOICE_STYLE` – configure `SpeechEngine`.
* `V2_DEFAULT_USER_UUID` – fallback UUID for attempts when auth is not wired.
* SQLite path defaults to `data/polish_tutor.db`; Postgres is supported via `DATABASE_URL`.

---

# 🚫 **Do Not**

* Touch `frontend-react/` or Jinja templates.
* Revert endpoints back to stub/mock implementations.
* Store raw audio bytes inside the DB (only references/paths go into models).
* Create new routers outside `/api/v2`.
* Rewrite caching folders or remove generated audio without approval.

---

# ✅ **Definition of Done**

Phase B stays green when:

* All three endpoints work end-to-end against OpenAI + Murf (with graceful fallback logging when keys are missing).
* Responses conform exactly to the schemas above.
* Lesson audio is always available under `/static/audio_cache_v2/*` (generated, cached, or placeholder file).
* Evaluation attempts persist via `ProgressTracker` with stats + review updates.
* No frontend changes are introduced.

---

# ▶️ **Cursor Start Prompt**

```
Follow everything in docs/cursor/cursor_phase_b_instructions.md.
Do not modify the React frontend.
Extend or fix the Phase B backend endpoints (speech, evaluate, lessons) without removing Murf/OpenAI integration or persistence.
Respond only with file creations and code changes.
```

---
