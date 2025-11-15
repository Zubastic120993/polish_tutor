# 🇵🇱 Patient Polish Tutor — Unified Phase 1 Specification

## 🧭 Overview
The **Patient Polish Tutor** is an AI-assisted conversational tutor guiding total beginners (A0 → A1) through practical spoken Polish. Phase 1 delivers a locally hosted FastAPI application with a minimalist browser UI and a pedagogically rich lesson core. This document merges the original functional specification with the peer-review improvements to form a single authoritative plan for development.

---

## 🚀 Getting Started & Dependencies

### Requirements
- **Python:** 3.9 or higher (3.10+ recommended)
- **Operating System:** macOS, Linux, or Windows (with WSL recommended)
- **Browser:** Chrome 90+, Firefox 88+, Safari 14+, or Edge 90+ (for Web Speech API support)

### Installation Steps

1. **Clone or download the project:**
   ```bash
   cd pol_app
   ```

2. **Create a virtual environment:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

### Dependencies (`requirements.txt`)

```txt
# Web Framework
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
websockets>=12.0
python-multipart>=0.0.6

# Database
sqlalchemy>=2.0.0
alembic>=1.12.0

# Data Validation
pydantic>=2.5.0
jsonschema>=4.19.0

# Authentication
python-jose[cryptography]>=3.3.0

# Speech & Audio
pyttsx3>=2.90
gTTS>=2.4.0
pydub>=0.25.1
mutagen>=1.47.0

# Text Processing & Similarity
python-Levenshtein>=0.23.0
phonemizer>=3.2.0

# Utilities
aiofiles>=23.2.0
python-dotenv>=1.0.0

# Optional: Cloud TTS (if using Azure)
# azure-cognitiveservices-speech>=1.32.0

# Development (optional)
# pytest>=7.4.0
# pytest-asyncio>=0.21.0
# black>=23.11.0
# flake8>=6.1.0
# mypy>=1.7.0
```

### Database Initialization

1. **Initialize Alembic migrations:**
   ```bash
   alembic init migrations
   ```

2. **Create initial migration:**
   ```bash
   alembic revision --autogenerate -m "Initial schema"
   ```

3. **Apply migrations:**
   ```bash
   alembic upgrade head
   ```

### Startup

**Development mode:**
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Production mode:**
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1
```

The application will be available at `http://localhost:8000`. Open this URL in a supported browser.

---

## 🎓 Pedagogical & Content Principles

### Scope
Practical A0 → A1 content focusing on everyday interactions:
> Greetings • Numbers • Time • Food & Shops • Transport • Appointments • Housing • Health & Doctor • Weather • Social niceties • Emergencies

### Curriculum Map
| Lesson Pack | Topic Theme | CEFR “Can-Do” Goal | Grammar Focus | Vocab Targets | Variants |
|-------------|-------------|-------------------|---------------|---------------|----------|
| Starter 01 | Greetings & Introductions | “Can greet politely and exchange names.” | Basic courtesy phrases | 12 core words | Formal / informal |
| Starter 02 | Café Orders | “Can order drinks and snacks politely.” | Accusative for objects | 15 | Dairy vs non-dairy |
| Starter 03 | Numbers & Prices | “Can ask for price and understand totals.” | Numbers 1–100 | 18 | Cash vs card |
| Starter 04 | Getting Around | “Can buy tickets and ask for directions.” | Locative basics | 16 | Tram vs bus |
| Starter 05 | Appointments | “Can schedule a simple appointment.” | Days/time phrases | 14 | Doctor vs hairdresser |
| Starter 06 | Housing Basics | “Can ask about apartments.” | Adjectives agreement | 17 | Rent vs buy |
| Starter 07 | Health & Pharmacy | “Can describe simple symptoms.” | Verbs in present | 16 | Cold vs allergy |
| Starter 08 | Weather & Small Talk | “Can comment on weather and mood.” | Adverbs & comparatives | 15 | Sunny vs rainy |
| Starter 09 | Emergencies | “Can request urgent help.” | Imperative basics | 12 | Tourist vs resident |
| Starter 10 | Social Niceties | “Can thank, apologize, and sign off.” | Modal particles | 14 | Formal vs casual |

Each pack contains **5–8 micro-dialogues** with optional variants for replay depth. Future packs extend toward A2 once Phase 1 stabilizes.

### Teaching Philosophy
| Concept | Implementation |
|--------|----------------|
| **Patient by Design** | Slow mode, repeat-slower, “I didn’t get it” button, unlimited retries without penalty. |
| **Micro-dialogues First** | Real-world exchanges of 1–3 lines (e.g., order coffee, ask for bus). |
| **Two-Lane Explanation** | Simple English summary + optional deeper grammar view (“Why *kawę*?”). |
| **Immediate Feedback** | Detect smallest error (e.g., wrong ending), highlight gently, replay audio. |
| **Pronunciation Focus** | Native audio (1.0× & 0.75×), waveform scrub, IPA tips for nasal vowels (ą / ę / ń / ł). |
| **Beginner-Safe SRS** | Capped new:review ratio (≤ 3 : 7); confidence slider after each attempt. |
| **CEFR-Mapped Lessons** | Each unit carries “can-do” labels (e.g., “Can order a drink politely”). |

### Language Fade-Out Strategy
- Lessons 1–3: English translation visible by default; optional hide toggle.
- Lessons 4–6: Tutor response in Polish with short English gloss beneath.
- Lessons 7–10: Polish primary; English available via “Show translation”.
- Bonus sessions: Polish only, English hints via “Explain why”.

### Teacher Notes Appendix (for future human facilitators)
- Tone: “Warm coach”, avoid sarcasm, sprinkle light humor.
- Encourage learners to verbalize confidence score (1–5) after each attempt.
- Suggest real-world homework prompts (e.g., “Order a coffee in Polish tomorrow”).

---

## 💬 UX & Behavioral Principles
- Voice-first yet fully usable by text.
- Encouraging tone — never punitive.
- Sessions remain short (5–7 minutes / ≤ 15 taps).
- Offline-ready starter pack (10 lessons pre-bundled).
- Accessibility baked in: dyslexia font option, high-contrast themes, ARIA labels.

### UX Flow Overview
1. **Home Dashboard** → resume lesson, start review, view stats.
2. **Lesson Dialog** → tutor intro → hear audio → learner responds (voice/text) → feedback loop → optional grammar insight → next prompt.
3. **Mini Quiz Wrap** → recap phrases, confidence slider, SRS enqueue.
4. **Review Queue** → due phrases served with quick attempt mode.
5. **Settings & Profiles** → adjust modes, switch personas, export data.

### Accessibility & QA Checklist
- Minimum tap target ≥ 48 px; keyboard focus order tested.
- High contrast ratio ≥ 4.5:1; dyslexia-friendly font toggle.
- Screen reader labels on mic, playback, and quick action controls.
- Alt text for icons; animation duration ≤ 300 ms to avoid motion sickness.
- Manual smoke test sheet covers voice-only, text-only, and mixed flows.

### Browser Compatibility

**Supported Browsers:**
- Chrome 90+ (recommended)
- Firefox 88+
- Safari 14+ (macOS/iOS)
- Edge 90+

**Web Speech API Support:**
- Chrome/Edge: Full support (online STT)
- Firefox: Partial support (may require polyfill)
- Safari: Limited support (iOS 14.5+)

**Feature Detection:**
```javascript
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  // Web Speech API available
} else {
  // Fallback to text-only mode or backend Whisper
}
```

**Fallback Behavior:**
- If Web Speech API unavailable → prompt user to use text input or enable backend Whisper mode
- Graceful degradation: all features work in text-only mode
- Browser notification when microphone access denied

---

## 🔐 Tech & Data Ethics
- **Privacy first:** default to on-device STT; explicit toggle for cloud usage.
- **Storage location:** 
  - **Project-relative paths:** `./data/lessons/` (lesson JSONs), `./static/audio/` (pre-recorded audio), `./audio_cache/` (generated TTS), `./logs/` (application logs), `./sessions/active/` (active sessions)
  - **User data directory:** `~/Documents/PatientPolishTutor/` used only for backups/exports (user-initiated)
  - **Database:** SQLite file at `./data/polish_tutor.db` (project root)
- **Encryption:** optional OS-level secure storage for profile credentials; sensitive exports zipped with password on request.
- **Retention policy:** auto-delete logs older than 90 days; backups older than 120 days purged unless user pins them.
- **Transparency:** offer activity export (`teacher_log.json`) detailing attempts, hints, and scores.

---

## 🛠️ Development Setup

### IDE Recommendations
- **VS Code** with extensions:
  - Python extension (Microsoft)
  - Pylance (type checking)
  - Black Formatter (code formatting)
  - SQLAlchemy (database tools)

### Code Quality Tools

**Pre-commit hooks** (`.pre-commit-config.yaml`):
```yaml
repos:
  - repo: https://github.com/psf/black
    rev: 23.11.0
    hooks:
      - id: black
  - repo: https://github.com/pycqa/flake8
    rev: 6.1.0
    hooks:
      - id: flake8
  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.7.0
    hooks:
      - id: mypy
```

**Installation:**
```bash
pip install pre-commit
pre-commit install
```

### Testing Setup

**Test dependencies:**
```txt
pytest>=7.4.0
pytest-asyncio>=0.21.0
pytest-cov>=4.1.0
httpx>=0.25.0  # For FastAPI test client
```

**Run tests:**
```bash
pytest tests/ -v --cov=src
```

### Environment Variables

Create `.env` file in project root:
```env
# Database
DATABASE_URL=sqlite:///./data/polish_tutor.db

# Application
DEBUG=True
LOG_LEVEL=INFO
SECRET_KEY=your-secret-key-here

# Speech (optional)
AZURE_SPEECH_KEY=your-azure-key
AZURE_SPEECH_REGION=your-region

# Server
HOST=0.0.0.0
PORT=8000
```

**Load in code:**
```python
from dotenv import load_dotenv
load_dotenv()
```

### Debug Mode

**Enable debug logging:**
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

**FastAPI debug mode:**
```bash
uvicorn main:app --reload --log-level debug
```

---

## 🔒 Security Considerations

### Input Validation
- **Pydantic models** for all API request/response schemas
- **Type checking** enforced at runtime
- **String sanitization** for user input (strip whitespace, limit length)

### SQL Injection Prevention
- **SQLAlchemy ORM** exclusively (no raw SQL)
- **Parameterized queries** for any custom SQL
- **Input validation** before database operations

### XSS Prevention
- **Sanitize user input** in responses (escape HTML)
- **Content Security Policy** headers in FastAPI responses
- **JSON responses** only (no HTML injection via API)

### Rate Limiting
- **Per-user rate limits:** 100 requests/minute per user_id
- **Per-IP rate limits:** 200 requests/minute per IP (Phase 1: single user, minimal risk)
- **Implementation:** use `slowapi` or custom middleware

### CORS Policy
- **Phase 1:** `localhost` and `127.0.0.1` only
- **Configuration:**
  ```python
  from fastapi.middleware.cors import CORSMiddleware
  app.add_middleware(
      CORSMiddleware,
      allow_origins=["http://localhost:8000"],
      allow_credentials=True,
      allow_methods=["*"],
      allow_headers=["*"],
  )
  ```

### Authentication
- **Lightweight token system** for multi-user support (Phase 1: optional)
- **JWT tokens** via `python-jose` for session management
- **Token expiration:** 24 hours
- **Password hashing:** `passlib` with bcrypt (if implementing password auth)

---

## 🧩 Core Functional Features

### 🗨️ Feature 1 – Chat-Style Conversation UI
**Purpose:** present lessons as natural dialogues.

**Behavior**
- Left = tutor messages; right = learner responses.
- Infinite scroll with auto-scroll to latest message.
- Input bar with Send + Mic icons; guard against empty or overly long submissions.
- Typing indicator with ellipsis animation; WebSocket push preferred for low latency (fallback to polling if WebSocket unavailable).
- Message types: `tutor`, `hint`, `info`, plus inline quick-actions (“Repeat”, “Explain why”, “Show translation”).
- Connection/status banner for offline detection.

**Implementation Notes**
- HTML template + lightweight JS for Phase 1; React-ready architecture.
- WebSocket channel (`/ws/chat`) for message updates; fallback long-poll every 2 s.
- Smooth CSS transitions and reduced-motion preference consideration.

**Outcome**
> Learners experience a calm, low-pressure chat environment instead of a test.

---

### 🔈 Feature 2 – Voice Output (Playback Audio)
**Purpose:** provide authentic Polish audio at adjustable speeds.

**Behavior**
- Tutor bubbles include a playback icon with progress glow.
- Speed toggles: 0.75× (slow), 1.0× (normal); remembers per user.
- Auto-stop previous audio when new playback begins.
- Cached files minimize latency; pre-bundled MP3 set supports offline mode.

**Audio Priority Order**
1. **Pre-recorded MP3** – Check `./static/audio/native/{lesson_id}/{phrase_id}.mp3` first
2. **Cached generated audio** – Check `./audio_cache/{hash}.mp3` (hash = MD5(text + voice + speed))
3. **pyttsx3 offline generation** – Generate on-demand, cache result
4. **Cloud TTS** (if online mode enabled) – gTTS or Azure Speech SDK, cache result

**Cache Key Generation:**
```python
import hashlib
cache_key = hashlib.md5(f"{text}:{voice_id}:{speed}".encode()).hexdigest()
```

**Implementation Notes**
- Primary: pre-recorded MP3s or bundled assets.
- Offline fallback: `pyttsx3` synthesis; online optional: `gTTS` or Azure voices when internet available.
- User preference stored in SQLite `Settings` table.

**User Impact**
> Repetition with native-quality sound strengthens phonetic memory.

---

### 🎤 Feature 3 – Voice Input (Microphone Recognition)
**Purpose:** enable speaking practice with friendly evaluation.

**Behavior**
- Mic button supports tap-to-toggle and push-to-talk modes.
- Live caption renders interim transcription (“You said…”) during recording.
- Auto-stop after 2 seconds of silence or manual tap.
- Errors (denied permission, background noise) trigger supportive prompts.

**Implementation Notes**
- Configurable speech mode:
  ```json
  { "speech_mode": "online" | "offline_whisper", "latency_ms": 0 }
  ```
- Browser Web Speech API for online mode; local Whisper container for offline (`latency_ms` health check warns if >1800 ms).
- Lenient similarity matching (Levenshtein ≤ 2) plus phoneme comparison where available.

**Outcome**
> Learners speak freely; system transcribes and responds without judgment.

---

### 💬 Feature 4 – Tutor Feedback Logic
**Purpose:** deliver instant, empathetic feedback tuned to learner attempts.

**Flow**
1. Normalize user input and expected phrase.
2. Compute text + phoneme similarity using dynamic threshold = `0.85 - min(0.15, phrase_length / 200)`.
3. Branch logic:
   - **High confidence** (score ≥ threshold) → praise + advance.
   - **Medium** (threshold - 0.25 ≤ score < threshold) → hint, slow audio replay, encourage retry.
   - **Low** (score < threshold - 0.25) → scaffolded answer + explanation.
4. Always praise effort first; highlight differences (e.g., kawę vs kawa).
5. Two consecutive lows → auto-reveal full answer with tone guidance.
6. Offer “Explain why” for grammar snippet.
7. Log attempt metadata including phoneme mismatches for analytics.

**Implementation**
- `FeedbackEngine.generate(score, user_text, target_phrase)` returns `{ reply_text, hint, audio, score, tone }`.

**Impact**
> Learners receive supportive, specific guidance that reduces frustration.

---

### 🧩 Feature 5 – Lesson Flow & Structure
**Purpose:** deliver each lesson as a cohesive mini-conversation with optional branching.

**Structure**
- Lesson metadata: id, title, level, tags, CEFR goal.
- 5–8 dialogue pairs plus optional variant branches.
- Intro message sets context ("You're in a café in Warsaw…").
- Loop: Hear audio → respond → feedback → optionally branch → next.
- Wrap-up summary and mini-quiz (2–3 quick checks).
- Marks phrases as mastered for SRS; allows replay or skip.

**Branching Logic**
1. **Exact string match:** Compare user input (normalized) to `options[].match` field
2. **Fuzzy match fallback:** If no exact match, use Levenshtein distance ≤ 2
3. **Default branch:** If no match found, use option with `"default": true`
4. **Evaluation order:** Check options in array order (first match wins)
5. **Branch target:** `next` field contains dialogue ID or lesson ID to continue

**Example Flow:**
```
User says: "herbata" → matches option with match="herbata" → next="coffee_002"
User says: "herbatę" → fuzzy match to "herbata" (distance=1) → next="coffee_002"
User says: "kawę" → no match → default branch → next="coffee_003"
```

**Implementation**
- Lessons stored as JSON; `LessonManager` parses, validates, and tracks state.
- Support branching via `next` field arrays and conditional options (see schema below).
- Progress auto-saves each turn.

**Outcome**
> Short, scenario-based interactions build confidence from the first session.

---

### 🧠 Feature 6 – SRS Memory & Review System
**Purpose:** strengthen retention via adaptive spaced repetition.

**SM-2 Algorithm Parameters**
- **Initial efactor:** 2.5 (default ease factor)
- **Quality mapping (0–5 scale):**
  - 0 (complete blackout) → efactor - 0.8
  - 1 (incorrect, remembered) → efactor - 0.54
  - 2 (incorrect, easy recall) → efactor - 0.32
  - 3 (correct, difficult) → efactor - 0.14
  - 4 (correct, easy) → efactor unchanged
  - 5 (perfect, instant) → efactor + 0.1
- **Minimum efactor:** 1.3 (prevents intervals from becoming too short)
- **Interval multipliers:**
  - First review: 1 day
  - Second review: efactor × previous interval (min 1 day)
  - Subsequent: efactor × previous interval
- **Maximum interval:** 365 days (cap to prevent excessive delays)

**Confidence Slider Impact**
- Confidence slider (1–5) modifies interval: `final_interval = base_interval × (1 + (confidence - 3) × 0.2)`
- Example: confidence=5 → +40% interval; confidence=1 → -40% interval
- Applied after SM-2 calculation

**Daily Scheduler**
- **Trigger:** Browser Notification API + backend check on app start
- **Check time:** Local 08:00 (user-configurable)
- **Review batch:** ≤ 5 minutes of items (approximately 10–15 phrases)
- **Notification:** "You have 12 phrases ready for review today!"

**Mechanics**
- Each phrase stored in `SRSMemory` with `strength_level` 1–5 and `efactor` (SM-2).
- Review intervals follow SM-2 adjusted curve with confidence modifier.
- After each attempt, score updates `strength_level` and `efactor`.
- Forgotten items (quality < 3) reinjected into next lesson's warm-up.

**Implementation**
- `SRSManager.schedule_next(quality, efactor, interval)` calculates next review date.
- `SRSManager.get_due_items(user_id)` returns phrases due for review.
- Local notifications (browser) remind users when backlog >10 items.

**Outcome**
> Reviews focus on weak items, keeping study time efficient and positive.

---

### ⚙️ Feature 7 – Settings & Personalization
**Purpose:** adapt experience to learner comfort and context.

**Details**
- Speed: Slow / Normal / Fast.
- Translation: Show / Hide / Smart (auto-hide after success).
- Mic mode: Tap / Hold.
- Tutor mode: “Coach” (gentle) / “Drill” (direct) / “Teacher” (mixed).
- Voice: Male / Female / Neutral.
- Audio output: Speakers / Headphones.
- Theme: Light / Dark / Dyslexia.
- Profile templates: Kid / Adult / Teacher (pre-sets for pacing and tone).
- Runtime preferences snapshot saved in `settings_snapshot.json` for quick reset.
- Export/reset progress with confirmation flow.

---

### ❤️ Feature 8 – Emotional & Motivational Layer
**Purpose:** sustain morale through empathy and delightful moments.

**Behavior**
- Contextual praise (“Świetnie!”, “Super robota!”) with optional personalization (“Dobrze, Anno!”).
- Gentle encouragement after struggles (“Spokojnie, spróbujmy jeszcze raz.”).
- Micro badges (“10 phrases mastered”, “First voice reply”).
- Calm progress meter (no streak anxiety).
- Cultural tidbits and humor sprinkled sparingly.

**Tone Library (sample lexicon)**
- Praise: “Brawo!”, “Świetna wymowa!”, “Perfekcyjnie brzmi.”
- Retry: “Prawie dobrze — zwróć uwagę na końcówkę.”
- Empathy: “To trudne słowo, mamy czas.”
- Humor: “Pierogi approve this attempt 😄”.

---

### 💾 Feature 9 – Data Storage & Progress Tracking
**Purpose:** maintain reliable offline records.

**Components**
- SQLite (SQLAlchemy) with indexed tables: `Users`, `Lessons`, `LessonProgress`, `Phrases`, `Attempts`, `SRSMemory`, `Settings`, `Meta`.
- Foreign keys enforce referential integrity; `created_at` / `updated_at` timestamps on transactional tables.
- Daily auto-backup to `backups/YYYY-MM-DD_HHMM.json` with retention policy.
- CSV/Anki export options; manual backups downloadable via UI.
- Resume button on startup pulls latest session snapshot.

**Outcome**
> User progress persists safely, even offline or after restarts.

---

## 🎭 Feature 10 – App Personality & Dialogue Tone
**Essence:** calm, playful, and forgiving with occasional cultural nods.

**Tone Manifesto**
- Warm, slightly humorous, never ironic.
- Encourages effort; celebrates small wins.
- Mixes simple English early, fades to Polish dominance by mid-course.
- Uses emoji sparingly (≤1 per message) to reinforce emotion.
- Maintains consistent persona “Polly the Pierogi” as supportive tutor.

**Style Lexicon**
- Greetings: “Cześć, gotowy na krótką rozmowę?”
- Farewell: “Świetnie dziś poszło. Widzimy się jutro!”
- Culture bite: “W Polsce kawa parzona to klasyk — spróbuj kiedyś!”

---

## 🧱 Feature 11 – Architecture (Python + OOP)
**Backend** – FastAPI (async) • **Frontend** – HTML/JS chat layer (React-ready)

**Core Modules**
- `Tutor` – orchestrates conversation state, fetches lesson data, routes feedback.
- `LessonManager` – loads, validates, and navigates lesson JSON with branching.
- `FeedbackEngine` – evaluates user input and returns supportive responses.
- `SRSManager` – schedules reviews and tracks memory strength.
- `SpeechEngine` – handles TTS/STT with offline and online modes.
- `Database` – ORM models, migrations, and data services.
- `AppContext` – central dependency registry providing shared instances (db session factory, config, cache manager) to avoid singleton sprawl.
- `Utils` – similarity helpers, audio utilities, logging wrappers.

**Design Goals**
- Clear separation of concerns; each module unit-testable.
- `AppContext` built during FastAPI startup, injected via dependency overrides.
- Prepared for future React frontend or mobile clients via consistent service layer.

---

## 📚 Library Specifications

### Backend Framework
- **FastAPI** (≥0.104.0) – async web framework, automatic OpenAPI docs
- **Uvicorn** (≥0.24.0) – ASGI server with WebSocket support
- **WebSockets** (≥12.0) – server-side WebSocket handling

### Database & ORM
- **SQLAlchemy** (≥2.0.0) – ORM for database models and queries
- **Alembic** (≥1.12.0) – database migration tool
- **SQLite** – embedded database (Phase 1), upgradeable to PostgreSQL later

### Data Validation
- **Pydantic** (≥2.5.0) – request/response validation, type checking
- **jsonschema** (≥4.19.0) – lesson JSON schema validation

### Authentication & Security
- **python-jose** (≥3.3.0) – JWT token encoding/decoding
- **python-multipart** (≥0.0.6) – file upload support

### Text-to-Speech (TTS)
- **pyttsx3** (≥2.90) – offline TTS engine (cross-platform)
- **gTTS** (≥2.4.0) – Google Text-to-Speech (online, requires internet)
- **Azure Speech SDK** (optional, ≥1.32.0) – cloud TTS with premium voices

### Speech-to-Text (STT)
- **Web Speech API** – browser-native STT (client-side, online)
- **Whisper.cpp** (via subprocess) – offline STT backend (requires local installation)

### Text Processing & Similarity
- **python-Levenshtein** (≥0.23.0) – fast string similarity calculation
- **phonemizer** (≥3.2.0) – phoneme conversion for pronunciation comparison

### Audio Processing
- **pydub** (≥0.25.1) – audio file manipulation (format conversion, speed adjustment)
- **mutagen** (≥1.47.0) – audio metadata reading/writing

### Utilities
- **aiofiles** (≥23.2.0) – async file I/O operations
- **python-dotenv** (≥1.0.0) – environment variable management

### Logging (Optional Enhancement)
- **structlog** (optional) – structured logging with context

### Testing (Development)
- **pytest** (≥7.4.0) – test framework
- **pytest-asyncio** (≥0.21.0) – async test support
- **httpx** (≥0.25.0) – FastAPI test client

### Code Quality (Development)
- **black** (≥23.11.0) – code formatter
- **flake8** (≥6.1.0) – linting
- **mypy** (≥1.7.0) – static type checking

---

## 🎨 Feature 12 – Visual Design & Theme Foundations
- Establish base CSS variables early:
  ```css
  :root {
    --color-bg: #f4f5f7;
    --color-bg-dark: #10131a;
    --color-accent: #e63946;
    --color-success: #2a9d8f;
    --font-body: 'Atkinson Hyperlegible', sans-serif;
    --radius-pill: 20px;
  }
  ```
- Typography optimized for legibility; body font size 18 px baseline.
- Dark mode and dyslexia palette defined up front to avoid refactor.
- Iconography consistent (Feather or custom set); accessible color pairs validated.

---

## 🔗 Feature 13 – Backend Class Interaction Flow
**Flow**
1. User input (text or speech) → `/chat/respond` via POST or WebSocket event.
2. FastAPI endpoint retrieves `Tutor` from `AppContext` and calls `Tutor.respond()`.
3. `Tutor` requests current phrase from `LessonManager` (branch aware).
4. `Tutor` sends user input + expected phrase to `FeedbackEngine`.
5. `FeedbackEngine` returns response + score + tone cues.
6. `SRSManager` updates memory state; `Database` logs attempt.
7. Response streamed back to client: partial message (typing effect) → final payload with audio URLs and next-step metadata.

**Outcome**
> Streaming responses and clean dependency flow keep interactions fluid.

---

## 🌐 Feature 14 – API Endpoints

### Endpoint Table
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/chat/respond` | POST / WebSocket | Process learner message → tutor reply (supports streaming). |
| `/lesson/get` | GET | Fetch lesson dialogues + metadata. |
| `/lesson/options` | GET | Retrieve branch options for current dialog node. |
| `/review/get` | GET | Provide due SRS items. |
| `/review/update` | POST | Submit review result (success/partial/fail). |
| `/settings/get` | GET | Load preferences for profile. |
| `/settings/update` | POST | Save preferences snapshot. |
| `/user/stats` | GET | Return progress %, study time, accuracy trends. |
| `/audio/generate` | POST | Optional dynamic TTS generation (caches if new). |
| `/backup/export` | GET | Download latest progress backup (JSON or CSV). |
| `/auth/token` | POST | Lightweight token exchange for multi-user support. |
| `/error/report` | POST | Log client-side errors with context. |

### API Contract Examples

**POST `/chat/respond`**
```json
Request:
{
  "user_id": 1,
  "text": "Poproszę kawę",
  "lesson_id": "coffee_001",
  "dialogue_id": "coffee_001_d1"
}

Response 200:
{
  "status": "success",
  "message": "Świetnie!",
  "data": {
    "reply_text": "Świetnie! Poproszę kawę. Co jeszcze?",
    "score": 0.92,
    "feedback_type": "high",
    "hint": null,
    "audio": ["/static/audio/native/coffee_001/response.mp3"],
    "next_dialogue_id": "coffee_001_d2"
  },
  "metadata": {
    "attempt_id": 123,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}

Response 400:
{
  "status": "error",
  "message": "Invalid input: text cannot be empty",
  "data": null
}
```

**GET `/lesson/get?lesson_id=coffee_001`**
```json
Response 200:
{
  "status": "success",
  "data": {
    "id": "coffee_001",
    "title": "In the Café",
    "level": "A0",
    "dialogues": [...]
  }
}

Response 404:
{
  "status": "error",
  "message": "Lesson not found: coffee_001"
}
```

**WebSocket `/ws/chat`**
```json
Client → Server:
{
  "type": "message",
  "user_id": 1,
  "text": "Poproszę kawę"
}

Server → Client (streaming):
{
  "type": "typing",
  "message": "Tutor is thinking..."
}

Server → Client (final):
{
  "type": "response",
  "data": {
    "reply_text": "Świetnie!",
    "score": 0.92,
    "audio": [...]
  }
}
```

**POST `/review/update`**
```json
Request:
{
  "user_id": 1,
  "phrase_id": "coffee_001_p1",
  "quality": 4,
  "confidence": 3
}

Response 200:
{
  "status": "success",
  "data": {
    "next_review": "2024-01-20T08:00:00Z",
    "efactor": 2.5,
    "interval_days": 5
  }
}
```

**All responses** follow `{ status, message, data, metadata }` schema with optional `audio` array.
- **Status codes:** 200 (success), 400 (bad request), 404 (not found), 500 (server error)
- **Error format:** `{ "status": "error", "message": "description", "data": null }`

---

## 📘 Feature 15 – Lesson Data Format & Loader
**JSON Schema Sample**
```json
{
  "id": "coffee_001",
  "title": "In the Café",
  "level": "A0",
  "cefr_goal": "Can order a drink politely",
  "tags": ["food", "greeting"],
  "dialogues": [
    {
      "id": "coffee_001_d1",
      "tutor": "Dzień dobry, co podać?",
      "expected": ["Poproszę kawę.", "Kawę, proszę."],
      "translation": "Good morning, what would you like?",
      "hint": "Use 'poproszę' + item in accusative.",
      "grammar": "Accusative",
      "audio": "coffee_001.mp3",
      "audio_slow": "coffee_001_slow.mp3",
      "options": [
        { "match": "herbata", "next": "coffee_002_d1", "description": "User orders tea" },
        { "match": "sok", "next": "coffee_002_d2", "description": "User orders juice" },
        { "default": true, "next": "coffee_003_d1", "description": "Default coffee order" }
      ]
    }
  ]
}
```

**Branching Rules:**
- `options[].match`: Exact string to match (case-insensitive, normalized)
- `options[].next`: Dialogue ID or lesson ID to jump to
- `options[].default`: Boolean flag for fallback branch (exactly one required)
- Matching: Exact match first, then Levenshtein distance ≤ 2, then default
- `expected`: Array of acceptable answers (used for feedback scoring, not branching)

**Loader Flow**
1. Read JSON from `./data/lessons/`.
2. Validate schema using `jsonschema` library.
3. Check audio file existence: `./static/audio/native/{lesson_id}/{audio}`.
4. Validate branch integrity: all `next` IDs must exist in lesson or referenced lessons.
5. Instantiate `Lesson` and `Phrase` entities.
6. Cache validated lessons; expose via `LessonManager`.

---

## 🔊 Feature 16 – Speech Engine Integration

### TTS (Text-to-Speech)
**Priority Order:**
1. Pre-recorded MP3 from `./static/audio/native/`
2. Cached generated audio from `./audio_cache/` (hash-based lookup)
3. `pyttsx3` offline generation (cross-platform, no internet required)
4. Cloud TTS (gTTS or Azure Speech SDK) when `speech_mode` set to `online` and internet available

**Cache Strategy:**
- Cache key: MD5 hash of `{text}:{voice_id}:{speed}`
- Cache location: `./audio_cache/{hash}.mp3`
- Deduplication: Check cache before generation
- Cache cleanup: Remove files older than 30 days if disk space needed

### STT (Speech-to-Text)
- **Online mode:** Web Speech API (browser-native, client-side)
- **Offline mode:** Whisper.cpp via subprocess (requires local installation)
- Latency monitor logs average transcription time; warns in UI if lag >1800 ms
- Handles background noise via configurable sensitivity threshold

### Fallbacks
- **Missing microphone** → auto-switch to text mode and prompt user: "Microphone not detected. You can type your response instead."
- **Audio playback failure** → show text reminder: "Audio unavailable. Here's the text: [phrase]"
- **STT timeout** → supply text input suggestion with empathy: "Couldn't hear you clearly. Try typing your answer or speaking closer to the microphone."
- **Web Speech API unavailable** → fallback to backend Whisper or text-only mode

---

## 💾 Feature 17 – Database, Migrations & Progress Tracking

### Complete Database Schema

**Users Table:**
```sql
CREATE TABLE Users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    profile_template TEXT DEFAULT 'adult',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_users_name ON Users(name);
```

**Lessons Table:**
```sql
CREATE TABLE Lessons (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    level TEXT NOT NULL,
    tags TEXT,  -- JSON array stored as text
    cefr_goal TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_lessons_level ON Lessons(level);
```

**Phrases Table:**
```sql
CREATE TABLE Phrases (
    id TEXT PRIMARY KEY,
    lesson_id TEXT NOT NULL,
    text TEXT NOT NULL,
    grammar TEXT,
    audio_path TEXT,
    FOREIGN KEY(lesson_id) REFERENCES Lessons(id) ON DELETE CASCADE
);
CREATE INDEX idx_phrases_lesson ON Phrases(lesson_id);
```

**LessonProgress Table:**
```sql
CREATE TABLE LessonProgress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    lesson_id TEXT NOT NULL,
    status TEXT DEFAULT 'not_started',  -- not_started, in_progress, completed
    current_dialogue_id TEXT,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY(lesson_id) REFERENCES Lessons(id) ON DELETE CASCADE,
    UNIQUE(user_id, lesson_id)
);
CREATE INDEX idx_lesson_progress_user ON LessonProgress(user_id);
CREATE INDEX idx_lesson_progress_lesson ON LessonProgress(lesson_id);
CREATE INDEX idx_lesson_progress_status ON LessonProgress(status);
```

**Attempts Table:**
```sql
CREATE TABLE Attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    phrase_id TEXT NOT NULL,
    user_input TEXT NOT NULL,
    score REAL NOT NULL,  -- 0.0 to 1.0
    phoneme_diffs TEXT,  -- JSON array of mismatches
    feedback_type TEXT,  -- high, medium, low
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY(phrase_id) REFERENCES Phrases(id) ON DELETE CASCADE
);
CREATE INDEX idx_attempts_user ON Attempts(user_id);
CREATE INDEX idx_attempts_phrase ON Attempts(phrase_id);
CREATE INDEX idx_attempts_created ON Attempts(created_at);
```

**SRSMemory Table:**
```sql
CREATE TABLE SRSMemory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    phrase_id TEXT NOT NULL,
    strength_level INTEGER DEFAULT 1,  -- 1-5
    efactor REAL DEFAULT 2.5,
    interval_days INTEGER DEFAULT 1,
    next_review TIMESTAMP NOT NULL,
    last_review TIMESTAMP,
    review_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY(phrase_id) REFERENCES Phrases(id) ON DELETE CASCADE,
    UNIQUE(user_id, phrase_id)
);
CREATE INDEX idx_srs_user ON SRSMemory(user_id);
CREATE INDEX idx_srs_next_review ON SRSMemory(next_review);
CREATE INDEX idx_srs_phrase ON SRSMemory(phrase_id);
```

**Settings Table:**
```sql
CREATE TABLE Settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    key TEXT NOT NULL,
    value TEXT,  -- JSON blob
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES Users(id) ON DELETE CASCADE,
    UNIQUE(user_id, key)
);
CREATE INDEX idx_settings_user ON Settings(user_id);
```

**Meta Table:**
```sql
CREATE TABLE Meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Insert initial version
INSERT INTO Meta (key, value) VALUES ('db_version', '1.0');
```

### Migrations & Backups
- Use Alembic for schema migrations (tracked in `migrations/`).
- `Meta.db_version` increments with every structural change (e.g., '1.0' → '1.1').
- Backups timestamped (`YYYY-MM-DD_HHMM.json`) to avoid overwrite.
- Restore routine supports selective table import.
- Foreign key constraints enforced (SQLite PRAGMA foreign_keys = ON).

---

## 🛡️ Feature 18 – Error Handling & Logging

### Error Categories & User Messages

| Error Type | User-Facing Message | Recovery Action |
|------------|---------------------|-----------------|
| **Speech Error** | "Couldn't hear you clearly. Try speaking closer to the microphone or type your answer." | Switch to text input, retry button |
| **Audio Playback Failure** | "Audio unavailable. Here's the text: [phrase]. You can still continue." | Show text, provide download link |
| **Database Error** | "Progress couldn't be saved. Don't worry, we'll try again automatically." | Auto-retry, use temp cache |
| **Lesson Data Error** | "Lesson file is missing. Please restart the app or contact support." | Skip invalid phrase, log issue |
| **Network Issue** | "Connection lost. Your progress is saved. Reconnecting..." | Queue offline actions, auto-sync |
| **STT Timeout** | "Speech recognition timed out. Try typing your answer or speaking again." | Suggest text input, retry |
| **Microphone Denied** | "Microphone access denied. You can use text input instead." | Auto-switch to text mode |
| **Unhandled Error** | "Something went wrong. Your progress is safe. Please refresh the page." | Log error, show support contact |

### Logging Configuration

**Python Logging Setup:**
```python
import logging
from logging.handlers import RotatingFileHandler

handler = RotatingFileHandler(
    'logs/app.log',
    maxBytes=1_000_000,  # 1MB
    backupCount=7
)
handler.setLevel(logging.INFO)
formatter = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
handler.setFormatter(formatter)
logger.addHandler(handler)
```

**Log Levels:**
- **INFO:** Normal operations (lesson started, attempt logged)
- **WARNING:** Recoverable issues (audio cache miss, fallback used)
- **ERROR:** Failures requiring attention (database error, file not found)
- **CRITICAL:** System-level failures (database corruption, disk full)

### Error Recovery

- **Critical failures** trigger user-friendly modal with retry guidance
- **Offline queue** stores unsent events; syncs when connection returns
- **Developer diagnostics toggle** exposes raw logs for debugging (hidden by default)
- **Auto-retry** for transient errors (database locks, network timeouts)
- **Graceful degradation** ensures core features work even if optional features fail

---

## 🧭 Feature 19 – Session Management
- Track active user profile, current lesson node, and timestamps.
- Auto-save after each response and every 30 seconds idle.
- Session snapshots stored in `sessions/active/`; history archived weekly.
- Multi-profile support with quick switcher (protect with passcode if desired).
- Crash recovery reloads last snapshot and replays final tutor prompt.

---

## 📊 System KPIs & Performance Targets
- **TTS latency:** ≤ 1500 ms avg (pre-recorded) / ≤ 2500 ms fallback synth.
- **STT latency:** ≤ 1800 ms offline Whisper; alert if exceeded.
- **UI response:** typing indicator appears ≤ 300 ms after user sends.
- **Uptime goal:** 99% within local runtime sessions.
- **Data integrity:** zero failed commits (monitored via transaction logs).

### Performance Benchmarks

| Endpoint | Expected Response Time | Target (p95) | Notes |
|----------|----------------------|--------------|-------|
| `POST /chat/respond` | 200–800 ms | < 1000 ms | Includes feedback calculation |
| `GET /lesson/get` | 50–200 ms | < 300 ms | Cached lesson data |
| `GET /review/get` | 100–300 ms | < 500 ms | Database query + filtering |
| `POST /review/update` | 50–150 ms | < 200 ms | SRS calculation + DB write |
| `GET /settings/get` | 20–50 ms | < 100 ms | Simple DB lookup |
| `POST /audio/generate` | 500–2000 ms | < 2500 ms | TTS generation (if not cached) |
| WebSocket message | 50–200 ms | < 300 ms | Real-time chat |

**Memory Usage:**
- **Base application:** ~50–100 MB
- **Per active session:** ~10–20 MB
- **Audio cache:** ~5–10 MB per 100 cached phrases
- **Database:** ~1–5 MB for typical usage (1000+ attempts)

**Concurrent Capacity:**
- **Phase 1:** Single user (local deployment)
- **Future:** Multi-user support with connection pooling

**Database Query Performance:**
- **Simple SELECT:** < 10 ms (indexed queries)
- **Complex JOIN:** < 50 ms (with proper indexes)
- **SRS due items query:** < 100 ms (indexed on `next_review`)

---

## 🧪 Testing & QA Strategy
- **Unit Tests:** modules (`LessonManager`, `FeedbackEngine`, `SRSManager`, `SpeechEngine` adapters).
- **Integration Tests:** FastAPI endpoints using mocked speech services.
- **UI Smoke Tests:** Cypress/Playwright scripts covering chat, settings, review flows.
- **Manual Scenarios:** voice-only session, text-only session, offline resume, branch navigation.
- **Performance Tests:** measure STT/TTS latency under varied CPU loads.
- **Regression Checklist:** executed before each tagged release; stored in repo `QA_CHECKLIST.md`.

---

## 🌍 Localization & Internationalization
- Adopt `gettext` or lightweight key-based localization for UI strings.
- Lesson JSON supports multilingual metadata (English, Polish, future language keys).
- Content pipeline prepared for future languages by isolating copy in `/i18n/`.
- Accept user locale preference; default to English UI with Polish lesson content.

---

## 📦 Versioning & Release Management
- Semantic versioning (`v0.1.0` for Phase 1 prototype).
- `version.json` includes build metadata (commit hash, build date).
- Maintain `CHANGELOG.md` with Keep a Changelog format.
- Releases packaged as zip with `run.sh`, `README`, `data/`, and `requirements.txt`.

---

## ✅ Definition of Done (Phase 1)
- [ ] One complete lesson playable end-to-end (chat + audio + feedback + quiz).
- [ ] Voice mode toggle verified offline (Whisper) and online (Web Speech API).
- [ ] SRS review queue generates daily tasks and records outcomes.
- [ ] All endpoints return schema-compliant JSON with status metadata.
- [ ] Settings persist across restarts and profile switches.
- [ ] Automated tests pass (unit + integration) and manual smoke list completed.

---

## 🧩 Phase 1 Summary & Outcome
| Area | Description | Status |
|------|-------------|--------|
| Chat Flow | User ↔ Tutor ↔ Feedback ↔ SRS | ✅ Designed |
| API Layer | FastAPI routes with auth & streaming | ✅ Defined |
| Lesson Loader | JSON schema with branching & validation | ✅ Ready |
| Speech System | TTS/STT offline-first with fallbacks | ✅ Planned |
| Database | ORM schema + migrations | ✅ Ready |
| Error Safety | Structured logging & recovery | ✅ Planned |
| Session Handling | Snapshot + multi-profile support | ✅ Designed |
| UI Theme | Core tokens established | ✅ Initiated |
| Testing Plan | Unit, integration, UI smoke suite | ✅ Documented |

---

## 🏁 Phase 1 Outcome
- Unified voice/text learning loop emphasizing patience and clarity.
- Offline-first functionality with optional cloud enhancements.
- Structured data retention, migration, and backup strategy.
- Clear KPIs, testing roadmap, and Definition of Done guiding delivery.

---

**Next Steps**
1. Prioritize implementation sprint for Lesson Pack Starter 01.
2. Set up Alembic migrations, test database initialization.
3. Prototype WebSocket chat with typing indicator and streaming replies.
4. Integrate offline Whisper container and latency monitoring hooks.
5. Validate SRS flow with seed data and adjust difficulty curve.

---

## 🔧 Troubleshooting Guide

### Common Issues & Solutions

#### Microphone Not Detected
**Symptoms:** Mic button grayed out, no audio input
**Solutions:**
1. Check browser permissions: Settings → Privacy → Microphone
2. Try different browser (Chrome recommended)
3. Restart browser and app
4. Check system microphone settings (OS level)
5. Fallback: Use text input mode

**Debug:**
```javascript
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => console.log("Mic OK"))
  .catch(err => console.error("Mic error:", err));
```

#### Audio Playback Fails
**Symptoms:** No sound when clicking playback icon
**Solutions:**
1. Check browser console for CORS errors
2. Verify audio files exist: `./static/audio/native/`
3. Check file format (MP3 recommended)
4. Try different browser
5. Fallback: Text display mode

**Debug:**
```bash
ls -la ./static/audio/native/
# Check file permissions and existence
```

#### Database Locked Error
**Symptoms:** "database is locked" error in logs
**Solutions:**
1. Close other instances of the app
2. Check for hung database connections
3. Restart application
4. If persistent: backup database, recreate

**Debug:**
```python
import sqlite3
conn = sqlite3.connect('./data/polish_tutor.db')
conn.execute("PRAGMA busy_timeout = 30000")  # 30s timeout
```

#### WebSocket Connection Drops
**Symptoms:** Chat stops responding, "Connection lost" message
**Solutions:**
1. Check network connectivity
2. Restart FastAPI server
3. Clear browser cache
4. Check firewall settings (localhost:8000)
5. Fallback: Use HTTP polling mode

**Debug:**
```bash
# Check if server is running
curl http://localhost:8000/health
# Check WebSocket endpoint
wscat -c ws://localhost:8000/ws/chat
```

#### Lesson Data Not Loading
**Symptoms:** "Lesson not found" error, blank lesson screen
**Solutions:**
1. Verify lesson JSON exists: `./data/lessons/coffee_001.json`
2. Check JSON syntax (use JSON validator)
3. Verify audio paths in lesson JSON
4. Check file permissions
5. Review logs: `./logs/app.log`

**Debug:**
```bash
# Validate JSON
python -m json.tool ./data/lessons/coffee_001.json
# Check file permissions
ls -la ./data/lessons/
```

#### Slow Performance
**Symptoms:** Delayed responses, laggy UI
**Solutions:**
1. Check database size (may need cleanup)
2. Clear audio cache if too large
3. Check system resources (CPU/memory)
4. Review log file size (rotate if needed)
5. Restart application

**Debug:**
```bash
# Check database size
du -h ./data/polish_tutor.db
# Check cache size
du -h ./audio_cache/
# Check log size
du -h ./logs/app.log
```

### Debug Commands

**Check application status:**
```bash
# Verify server is running
curl http://localhost:8000/docs

# Check database integrity
sqlite3 ./data/polish_tutor.db "PRAGMA integrity_check;"

# View recent logs
tail -n 50 ./logs/app.log

# Check Python dependencies
pip list | grep -E "fastapi|sqlalchemy|uvicorn"
```

**Reset application state:**
```bash
# Backup database
cp ./data/polish_tutor.db ./data/polish_tutor.db.backup

# Clear cache (keep pre-recorded audio)
rm -rf ./audio_cache/*

# Clear sessions
rm -rf ./sessions/active/*

# Reset logs (keep backups)
> ./logs/app.log
```

### Log File Locations

- **Application logs:** `./logs/app.log`
- **Error logs:** `./logs/error.log` (if configured)
- **Access logs:** `./logs/access.log` (if configured)
- **Database logs:** SQLite WAL files in `./data/`

### Getting Help

1. **Check logs first:** `./logs/app.log` for error details
2. **Enable debug mode:** Set `DEBUG=True` in `.env`
3. **Review documentation:** This specification document
4. **Check GitHub issues:** (if using version control)
5. **Contact support:** Include log excerpts and error messages


