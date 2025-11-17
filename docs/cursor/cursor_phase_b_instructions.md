

# **Patient Polish Tutor — Phase B Backend Instructions (v2.1.0)**

*This file defines everything Cursor agents must follow when implementing Phase B.*

---

# 🎯 **Purpose**

Phase B introduces the **backend speech pipeline**, including:

* 🔊 Whisper STT endpoint
* 🧠 Evaluation endpoint (phonetic + semantic scoring)
* 👉 Lesson progression endpoint
* 🔗 Backend schemas + services

Frontend (React) **must NOT be modified** — Phase A is frozen.

Cursor must generate **backend-only code** in a controlled manner.

---

# 🏛️ **Where Cursor Is Allowed to Work**

Cursor may modify/create files ONLY under:

```
src/api/routers/v2/
src/schemas/v2/
src/services/
src/models/v2/
```

Cursor may NOT touch:

❌ `frontend-react/`
❌ `frontend/templates/`
❌ existing v1 routers under `src/api/routers/*`
❌ database models outside `src/models/v2/`
❌ existing Murf code (unless adding safe wrapper)

---

# 📁 **Required Folder & File Structure**

Cursor must create these **exact files**, even if initially empty:

```
src/api/routers/v2/
  __init__.py
  speech.py        # POST /speech/recognize
  evaluate.py      # POST /evaluate
  lessons.py       # GET /lesson/{id}/next

src/schemas/v2/
  __init__.py
  speech.py
  evaluate.py
  lessons.py

src/services/
  whisper_stt.py
  evaluator.py
  murf_tts.py     # wrapper to replace Phase A mock audio in future

src/models/v2/
  __init__.py
  phrase_attempt.py
  user_progress.py
```

Cursor must not add anything else.

---

# 🔌 **API Endpoints to Implement (Phase B Scope)**

## **1. POST /api/v2/speech/recognize**

Input
`multipart/form-data` with file (`audio/webm`, `wav`, `ogg`, or `pcm`)

Output JSON:

```json
{
  "transcript": "Cześć, poproszę kawę",
  "lang": "pl",
  "words": [
    {"word": "Cześć", "start": 0.12, "end": 0.48},
    {"word": "poproszę", "start": 0.52, "end": 1.21}
  ]
}
```

Logic (Cursor must scaffold only):

* Save uploaded file to `/tmp/audio/`
* Pass path to `whisper_stt.transcribe()`
* Return schema

---

## **2. POST /api/v2/evaluate**

Input JSON:

```json
{
  "phrase_id": "p2",
  "user_transcript": "Jak się masz?",
  "audio_url": "/uploads/tmp123.webm"
}
```

Output JSON:

```json
{
  "score": 0.83,
  "phonetic_distance": 0.78,
  "semantic_accuracy": 0.90,
  "feedback": "Good, focus on the sound 'ś'.",
  "passed": true,
  "next_action": "advance"
}
```

Logic (Cursor scaffolds):

* Call evaluator.compute_scores(expected_text, user_text)
* Calculate final score:

  ```
  final = .6 * phonetic + .4 * semantic
  ```
* Return schema

---

## **3. GET /api/v2/lesson/{id}/next**

Output JSON:

```json
{
  "lesson_id": "lesson_mock_001",
  "index": 2,
  "total": 3,
  "tutor_phrase": {
    "id": "p3",
    "pl": "Miłego dnia!",
    "en": "Have a good day!",
    "audio_url": "/api/v2/audio/generate?p=p3"
  }
}
```

Logic:

* (Phase B) return mock data
* (Phase C) connect with DB
* (Phase D) connect with lesson engine

Cursor must only scaffold mock version.

---

# 🧠 **Phase B Service Behavior (Stub Only)**

Cursor must implement **stub logic**, not final logic.

### `whisper_stt.transcribe(file_path)`

Returns:

```python
{"transcript": "stub transcript", "words": []}
```

### `evaluator.compute_scores(expected, actual)`

Returns:

```python
{
  "phonetic_distance": 0.7,
  "semantic_accuracy": 0.8,
  "feedback": "Stub evaluation feedback."
}
```

### Why?

Because Phase B needs **structure first**, then real algorithms.

---

# 🧪 **Pydantic Schemas (Required Fields Only)**

Cursor must create schemas exactly matching:

### `SpeechRecognizeResponse`

```python
transcript: str
lang: str = "pl"
words: List[WordTiming]
```

### `EvaluateResponse`

```python
score: float
phonetic_distance: float
semantic_accuracy: float
feedback: str
passed: bool
next_action: Literal["advance", "retry"]
```

### `LessonNextResponse`

```python
lesson_id: str
index: int
total: int
tutor_phrase: PhraseSchema
```

---

# 🚫 **DO NOT DO (Strict)**

Cursor must NOT:

❌ modify frontend
❌ integrate real Whisper
❌ integrate real LLM
❌ write database migrations
❌ write SQLAlchemy models fully
❌ implement real phonetic algorithms
❌ create new endpoints beyond these three
❌ rename folders or change structure

---

# 🧱 **Definition of Done (Phase B)**

Cursor must deliver:

* New routers under `/api/v2/...`
* New schemas under `/schemas/v2/...`
* Stub Whisper service
* Stub Evaluator service
* Mock lesson progression endpoint
* Fully documented API contracts in code docstrings
* Zero frontend changes

---

# ▶️ **Cursor Start Prompt**

Place at the end of the file:

```
Follow all instructions in this file.
Implement Phase B backend scaffolding ONLY.
Do NOT modify frontend code.
Do NOT implement real scoring or real STT.
Create all routers, schemas, and stub services exactly as specified.
Respond ONLY with file creations and code changes.
```

---


