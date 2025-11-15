# Patient Polish Tutor - Specification Improvements Summary

This document summarizes all improvements made to `plan_unified.md` based on the peer review analysis.

---

## ✅ All Plan Steps Completed

### 1. Getting Started & Dependencies ✅
**Location:** Lines 8-107

**Added:**
- Python version requirements (3.9+, 3.10+ recommended)
- Operating system requirements
- Browser compatibility requirements
- Complete installation steps
- Full `requirements.txt` with all dependencies and versions
- Database initialization instructions
- Startup commands for development and production

**Key Dependencies:**
- FastAPI ≥0.104.0
- SQLAlchemy ≥2.0.0
- Alembic ≥1.12.0
- pyttsx3 ≥2.90 (offline TTS)
- python-Levenshtein ≥0.23.0 (similarity)
- phonemizer ≥3.2.0 (phoneme comparison)

---

### 2. Library Specifications ✅
**Location:** Line 621

**Added comprehensive library mapping:**
- Backend Framework (FastAPI, Uvicorn, WebSockets)
- Database & ORM (SQLAlchemy, Alembic, SQLite)
- Data Validation (Pydantic, jsonschema)
- Authentication & Security (python-jose)
- Text-to-Speech (pyttsx3, gTTS, Azure Speech SDK)
- Speech-to-Text (Web Speech API, Whisper.cpp)
- Text Processing (python-Levenshtein, phonemizer)
- Audio Processing (pydub, mutagen)
- Utilities (aiofiles, python-dotenv)
- Testing & Code Quality tools

---

### 3. Database Schema Expanded ✅
**Location:** Lines 916-1034

**Added complete SQL CREATE TABLE statements:**
- `Users` table with indexes
- `Lessons` table with level index
- `Phrases` table with foreign keys
- `LessonProgress` table with composite indexes
- `Attempts` table with analytics indexes
- `SRSMemory` table with review date index
- `Settings` table with user key index
- `Meta` table for version tracking

**Includes:**
- Column types (INTEGER, TEXT, REAL, TIMESTAMP)
- Constraints (PRIMARY KEY, FOREIGN KEY, NOT NULL, UNIQUE)
- Default values
- Index definitions for performance
- Foreign key cascades

---

### 4. API Contract Examples ✅
**Location:** Line 728

**Added request/response examples for:**
- `POST /chat/respond` - Full request/response with success and error cases
- `GET /lesson/get` - Lesson retrieval with 200/404 responses
- WebSocket `/ws/chat` - Streaming message format
- `POST /review/update` - SRS review submission

**Includes:**
- Status codes (200, 400, 404, 500)
- Error response format
- WebSocket message types (typing, response)
- Complete JSON schemas

---

### 5. Storage Paths Clarified ✅
**Location:** Tech & Data Ethics section (line 207)

**Standardized paths:**
- **Project-relative:** `./data/lessons/`, `./static/audio/`, `./audio_cache/`, `./logs/`, `./sessions/active/`
- **User data directory:** `~/Documents/PatientPolishTutor/` (backups/exports only)
- **Database:** `./data/polish_tutor.db` (project root)

**Clarified:** Separation between project files and user export data

---

### 6. SRS Parameters Specified ✅
**Location:** Line 491 (Feature 6)

**Added detailed SM-2 algorithm:**
- Initial efactor: 2.5
- Quality mapping (0-5 scale) → efactor adjustments
- Minimum efactor: 1.3
- Interval multipliers with examples
- Maximum interval: 365 days

**Confidence Slider:**
- Formula: `final_interval = base_interval × (1 + (confidence - 3) × 0.2)`
- Examples: confidence=5 → +40%, confidence=1 → -40%

**Daily Scheduler:**
- Browser Notification API + backend check
- Configurable check time (default 08:00)
- Review batch ≤ 5 minutes

---

### 7. Branching Logic Clarified ✅
**Location:** Lines 464 (Feature 5) and 759 (Feature 15)

**Specified matching rules:**
1. Exact string match (case-insensitive, normalized)
2. Fuzzy match fallback (Levenshtein distance ≤ 2)
3. Default branch (if no match)
4. Evaluation order (first match wins)

**Added examples:**
- User says "herbata" → exact match → branch to coffee_002
- User says "herbatę" → fuzzy match (distance=1) → branch to coffee_002
- User says "kawę" → no match → default branch

**Updated JSON schema** with dialogue IDs and option descriptions

---

### 8. Audio Priority Order Clarified ✅
**Location:** Lines 386 (Feature 2) and 728 (Feature 16)

**Specified priority chain:**
1. Pre-recorded MP3 from `./static/audio/native/`
2. Cached generated audio from `./audio_cache/` (hash-based)
3. pyttsx3 offline generation
4. Cloud TTS (gTTS/Azure) when online mode enabled

**Added:**
- Cache key generation (MD5 hash of text + voice + speed)
- Cache cleanup policy (30 days)
- Fallback behavior descriptions

---

### 9. Error Handling Examples ✅
**Location:** Feature 18 (line 1052)

**Added error categories table:**
- Speech Error
- Audio Playback Failure
- Database Error
- Lesson Data Error
- Network Issue
- STT Timeout
- Microphone Denied
- Unhandled Error

**Each includes:**
- User-facing message
- Recovery action
- Implementation guidance

**Added logging configuration:**
- Python logging setup with RotatingFileHandler
- Log levels (INFO, WARNING, ERROR, CRITICAL)
- Error recovery strategies

---

### 10. Security Considerations ✅
**Location:** Line 310

**Added comprehensive security section:**
- Input Validation (Pydantic models)
- SQL Injection Prevention (SQLAlchemy ORM only)
- XSS Prevention (HTML escaping, CSP headers)
- Rate Limiting (100 req/min per user, 200 req/min per IP)
- CORS Policy (localhost only for Phase 1)
- Authentication (JWT tokens, password hashing)

**Includes code examples** for CORS middleware configuration

---

### 11. Browser Compatibility ✅
**Location:** UX & Behavioral Principles section (line 178)

**Added browser support details:**
- Supported browsers: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Web Speech API support matrix
- Feature detection JavaScript code
- Fallback behavior when API unavailable

---

### 12. Development Setup ✅
**Location:** Line 219

**Added development environment guide:**
- IDE Recommendations (VS Code with extensions)
- Pre-commit hooks configuration (.pre-commit-config.yaml)
- Testing setup (pytest, pytest-asyncio, httpx)
- Environment variables (.env file structure)
- Debug mode instructions

**Includes:**
- Code quality tools (black, flake8, mypy)
- Test dependencies
- Environment variable examples

---

### 13. Formatting Fixed ✅
**Verified:**
- All JSON code blocks have proper `json` language tags
- Code blocks properly formatted
- Consistent markdown structure

---

### 14. Performance Benchmarks ✅
**Location:** Line 1119

**Added performance table:**
- Expected response times per endpoint
- Target p95 latencies
- Memory usage estimates
- Database query performance targets
- Concurrent capacity notes

**Endpoints covered:**
- `/chat/respond`: < 1000 ms
- `/lesson/get`: < 300 ms
- `/review/get`: < 500 ms
- `/audio/generate`: < 2500 ms
- WebSocket messages: < 300 ms

---

### 15. Troubleshooting Guide ✅
**Location:** Line 1216

**Added comprehensive troubleshooting:**
- **Common Issues:**
  - Microphone Not Detected
  - Audio Playback Fails
  - Database Locked Error
  - WebSocket Connection Drops
  - Lesson Data Not Loading
  - Slow Performance

**Each issue includes:**
- Symptoms
- Solutions (step-by-step)
- Debug commands/code

**Added sections:**
- Debug Commands (application status, reset procedures)
- Log File Locations
- Getting Help guide

---

## Summary Statistics

- **Total sections added:** 15 major improvements
- **Code examples added:** 20+ (Python, SQL, JavaScript, Bash, YAML, JSON)
- **Tables added:** 8 (dependencies, API endpoints, errors, performance, etc.)
- **SQL schemas:** 8 complete CREATE TABLE statements
- **API examples:** 4 complete request/response pairs
- **Lines added:** ~500+ lines of technical documentation

---

## Key Improvements Impact

1. **Implementation Readiness:** Developers can now start coding immediately with all dependencies and setup instructions
2. **Library Clarity:** Every feature has explicit library choices with versions
3. **Database Clarity:** Complete schema eliminates guesswork
4. **API Clarity:** Request/response examples prevent integration issues
5. **Error Handling:** User-facing messages ensure good UX even when things fail
6. **Performance Targets:** Clear benchmarks for optimization
7. **Troubleshooting:** Self-service debugging reduces support burden

---

## Files Modified

- `plan_unified.md` - Enhanced with all improvements (1,367 lines total)

---

**Date Completed:** 2024-01-15
**Status:** ✅ All improvements implemented and verified

