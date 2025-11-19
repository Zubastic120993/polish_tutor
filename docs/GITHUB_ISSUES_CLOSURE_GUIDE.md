# 📋 **GitHub Issues Closure Guide**

### *How to Close Issues Based on Implementation Status*

---

## ✅ **Issues Ready to Close (Fully Implemented)**

### **#107 – Implement Audio Cache & Cleanup Jobs** ✅

**Status:** Fully implemented

**Implementation:**
- `src/services/speech_engine.py` - `SpeechEngine.cleanup_cache()` method (line 113)
- Cache directory: `audio_cache_v2/` and `audio_cache/`
- Cleanup removes files older than `max_age_days` (default: 30 days)

**How to close:**
1. Add comment to issue:
   ```
   ✅ Implemented in `src/services/speech_engine.py`
   
   - `SpeechEngine.cleanup_cache(max_age_days=30)` method exists
   - Automatic cache management with MD5-based cache keys
   - Cache directory: `audio_cache_v2/` and `audio_cache/`
   - Returns count of removed files
   
   Closes #107
   ```
2. Commit and push a change that references it, or close manually

---

### **#106 – Implement Murf TTS Client** ✅

**Status:** Fully implemented

**Implementation:**
- `src/services/speech_engine.py` - Complete Murf TTS integration
- `_synthesize_with_murf()` method (line 168)
- Full API integration with caching, polling, and error handling

**How to close:**
1. Add comment to issue:
   ```
   ✅ Implemented in `src/services/speech_engine.py`
   
   - Full Murf API integration (`SpeechEngine` class)
   - `_synthesize_with_murf()` method implements complete TTS workflow
   - Supports voice selection, speed control, style configuration
   - Automatic polling for audio file generation
   - Caching and pre-recorded audio support
   - Environment variable configuration: `MURF_API_KEY`, `MURF_VOICE_ID`
   
   Closes #106
   ```
2. Close manually or reference in commit

---

### **#103 – Create Lesson Repository & Models** ✅

**Status:** Fully implemented

**Implementation:**
- `src/models/lesson.py` - Lesson model
- `src/services/lesson_flow.py` - `LessonFlowService` (acts as repository)
- `src/models/phrase.py` - Phrase model
- `src/models/lesson_progress.py` - LessonProgress model

**How to close:**
1. Add comment to issue:
   ```
   ✅ Implemented in `src/models/` and `src/services/lesson_flow.py`
   
   - `Lesson` model with all required fields
   - `LessonFlowService` provides repository-like interface
   - `Phrase`, `LessonProgress` models exist
   - Methods: `get_next_phrase()`, `find_phrase()`, `lesson_phrases()`, `total_for_lesson()`
   - JSON-based lesson storage with in-memory service layer
   
   Closes #103
   ```
2. Close manually

---

### **#101 – Implement Config Loader** ✅

**Status:** Fully implemented

**Implementation:**
- `src/core/app_context.py` - `AppContext.config` property
- Loads from environment variables via `dotenv`
- Config includes: database_url, debug, log_level, host, port

**How to close:**
1. Add comment to issue:
   ```
   ✅ Implemented in `src/core/app_context.py`
   
   - `AppContext.config` property loads from environment variables
   - Uses `python-dotenv` for `.env` file support
   - Config includes: database_url, debug, log_level, host, port
   - JWT settings also loaded from config
   - Global `app_context` instance available throughout app
   
   Closes #101
   ```
2. Close manually

---

### **#108 – Split Tutor Logic into Modular Services** ✅

**Status:** Fully implemented

**Implementation:**
- `src/core/tutor.py` - `Tutor` class with dependency injection
- Modular services: `FeedbackEngine`, `EvaluationService`, `SRSManager`, `SpeechEngine`, `LessonFlowService`, `LessonGenerator`
- Clean separation of concerns

**How to close:**
1. Add comment to issue:
   ```
   ✅ Implemented in `src/core/tutor.py`
   
   - `Tutor` class orchestrates modular services
   - Services: `FeedbackEngine`, `EvaluationService`, `SRSManager`, `SpeechEngine`, `LessonFlowService`, `LessonGenerator`
   - Dependency injection pattern used
   - Clean separation: feedback, evaluation, SRS, TTS, lesson flow, generation
   - All services can be mocked/tested independently
   
   Closes #108
   ```
2. Close manually

---

### **#109 – Implement JWT Authentication Flow** ✅

**Status:** Fully implemented

**Implementation:**
- `src/core/auth.py` - Complete JWT implementation
- `src/api/routers/auth.py` - Auth endpoints
- Token creation, verification, refresh token flow
- `get_current_user()` dependency for protected routes

**How to close:**
1. Add comment to issue:
   ```
   ✅ Implemented in `src/core/auth.py` and `src/api/routers/auth.py`
   
   - Full JWT authentication with access/refresh tokens
   - `create_access_token()`, `create_refresh_token()`, `verify_token()` functions
   - Password hashing with bcrypt
   - `/api/auth/login` and `/api/auth/refresh` endpoints
   - `get_current_user()` FastAPI dependency for route protection
   - Token expiration: 30 min (access), 7 days (refresh)
   - Configurable via environment variables
   
   Closes #109
   ```
2. Close manually

---

### **#110 – Create Frontend API Service Layer** ✅

**Status:** Fully implemented

**Implementation:**
- `frontend-react/src/lib/apiClient.ts` - `apiFetch()` function
- Type-safe API client with error handling
- Used throughout React components

**How to close:**
1. Add comment to issue:
   ```
   ✅ Implemented in `frontend-react/src/lib/apiClient.ts`
   
   - `apiFetch<T>()` generic function for type-safe API calls
   - Automatic JSON parsing and error handling
   - Content-Type headers automatically set
   - Used throughout React components for API communication
   - Error messages extracted from API responses
   
   Closes #110
   ```
2. Close manually

---

## 🟡 **Issues Partially Implemented (Close with Notes)**

### **#102 – Set up Async Database Layer** 🟡

**Status:** Partially implemented (sync exists, async partial)

**Implementation:**
- `src/services/database_service.py` - `Database` class with sync sessions
- `src/core/database.py` - `SessionLocal` factory
- Middleware uses async (FastAPI), but database operations are sync

**How to close:**
1. Add comment to issue:
   ```
   🟡 Partially implemented - sync database layer exists, async not fully implemented
   
   - `Database` service class exists with sync SQLAlchemy sessions
   - FastAPI endpoints are async, but database operations use sync sessions
   - `get_session()` context manager handles session lifecycle
   - Current implementation works well with FastAPI's async capabilities
   - Full async database layer (AsyncSession) could be future enhancement
   
   Current status: Functional, sync database works well. Async enhancement optional.
   ```
2. Either close as "resolved" or update issue to "enhancement for async database"

---

## ❌ **Issues Not Yet Implemented (Keep Open)**

### **#111 – Set Up Docker & GitHub Actions Pipeline** ❌

**Status:** Docker exists, GitHub Actions missing

**Implementation:**
- ✅ `ops/docker/docker-compose.yml` - Docker Compose exists
- ✅ `ops/docker/Dockerfile.app`, `Dockerfile.frontend`, `Dockerfile.worker` - Dockerfiles exist
- ❌ No `.github/workflows/` directory found
- ❌ No CI/CD pipeline configured

**Recommendation:**
1. Keep issue open
2. Add comment:
   ```
   Status: Docker setup complete, GitHub Actions pending
   
   ✅ Docker Compose configuration exists (`ops/docker/`)
   ✅ Dockerfiles for app, frontend, and worker exist
   ❌ GitHub Actions workflow not yet configured
   
   Next steps:
   - Create `.github/workflows/ci.yml` for automated testing
   - Add `.github/workflows/deploy.yml` for deployment
   ```
3. Create GitHub Actions workflows

---

### **#105 – Implement Session Manager** ❓

**Status:** Needs verification

**Recommendation:**
1. Check if this refers to:
   - Database sessions (already implemented via `Database.get_session()`)
   - User sessions/cookies (need to check)
   - Lesson sessions (may not be needed with current architecture)
2. If it's about database sessions → Can close (see #102)
3. If it's about user sessions → May need implementation
4. Comment on issue asking for clarification

---

### **#104 – Implement Agent Orchestrator** ❌

**Status:** Architecture doesn't require this

**Recommendation:**
1. Check if this is still relevant with current architecture
2. Current architecture uses:
   - `Tutor` class (orchestrates conversation)
   - Service layer (modular services)
   - No separate "agent orchestrator" needed
3. Comment on issue:
   ```
   Status: Architecture doesn't require separate agent orchestrator
   
   Current implementation uses:
   - `Tutor` class orchestrates conversation flow
   - Modular services (FeedbackEngine, EvaluationService, etc.)
   - Service layer pattern instead of agent orchestrator
   
   Question: Is a separate agent orchestrator still needed, or is current architecture sufficient?
   ```
4. Either close as "not needed" or update to describe new requirement

---

## 📝 **How to Close Issues on GitHub**

### **Method 1: Close with Comment**

1. Go to the issue page on GitHub
2. Add a comment with:
   ```
   ✅ Implemented in [file path]
   
   [Brief description of implementation]
   
   Closes #XXX
   ```
3. GitHub will automatically close the issue when you reference it in a commit message or PR

### **Method 2: Close Manually**

1. Go to the issue page
2. Click "Close issue" button
3. Add a closing comment explaining what was implemented

### **Method 3: Close via Commit/PR**

1. In your commit message or PR description, add:
   ```
   Closes #107
   Closes #106
   Closes #103
   ```
2. GitHub will automatically close issues when PR is merged

---

## 🎯 **Recommended Action Plan**

### **Immediate (Close These):**
1. **#107** - Audio Cache & Cleanup ✅
2. **#106** - Murf TTS Client ✅
3. **#103** - Lesson Repository & Models ✅
4. **#101** - Config Loader ✅
5. **#108** - Split Tutor Logic ✅
6. **#109** - JWT Authentication ✅
7. **#110** - Frontend API Service ✅

### **Review First:**
1. **#102** - Async Database Layer (sync exists, async optional)
2. **#105** - Session Manager (need clarification)
3. **#104** - Agent Orchestrator (may not be needed)

### **Keep Open:**
1. **#111** - Docker & GitHub Actions (Docker done, Actions missing)

---

## 📋 **Quick Reference - Copy-Paste Comments**

### **For #107:**
```
✅ Implemented - Audio Cache & Cleanup Jobs

Implemented in `src/services/speech_engine.py`:
- `SpeechEngine.cleanup_cache(max_age_days=30)` method removes old cache files
- MD5-based cache key generation
- Cache directories: `audio_cache_v2/` and `audio_cache/`
- Returns count of removed files

Closes #107
```

### **For #106:**
```
✅ Implemented - Murf TTS Client

Implemented in `src/services/speech_engine.py`:
- Full Murf API integration via `SpeechEngine` class
- `_synthesize_with_murf()` method with complete TTS workflow
- Supports voice selection, speed control, style configuration
- Automatic polling for audio generation
- Caching and error handling

Closes #106
```

### **For #103:**
```
✅ Implemented - Lesson Repository & Models

Implemented in `src/models/lesson.py` and `src/services/lesson_flow.py`:
- `Lesson`, `Phrase`, `LessonProgress` models exist
- `LessonFlowService` provides repository-like interface
- Methods: `get_next_phrase()`, `find_phrase()`, `lesson_phrases()`, `total_for_lesson()`
- JSON-based lesson storage with service layer

Closes #103
```

### **For #101:**
```
✅ Implemented - Config Loader

Implemented in `src/core/app_context.py`:
- `AppContext.config` property loads from environment variables
- Uses `python-dotenv` for `.env` file support
- Config includes: database_url, debug, log_level, host, port, JWT settings
- Global `app_context` instance available throughout app

Closes #101
```

### **For #108:**
```
✅ Implemented - Split Tutor Logic into Modular Services

Implemented in `src/core/tutor.py`:
- `Tutor` class orchestrates modular services via dependency injection
- Services: `FeedbackEngine`, `EvaluationService`, `SRSManager`, `SpeechEngine`, `LessonFlowService`, `LessonGenerator`
- Clean separation of concerns
- All services can be mocked/tested independently

Closes #108
```

### **For #109:**
```
✅ Implemented - JWT Authentication Flow

Implemented in `src/core/auth.py` and `src/api/routers/auth.py`:
- Full JWT authentication with access/refresh tokens
- Password hashing with bcrypt
- `/api/auth/login` and `/api/auth/refresh` endpoints
- `get_current_user()` FastAPI dependency for route protection
- Token expiration: 30 min (access), 7 days (refresh)

Closes #109
```

### **For #110:**
```
✅ Implemented - Frontend API Service Layer

Implemented in `frontend-react/src/lib/apiClient.ts`:
- `apiFetch<T>()` generic function for type-safe API calls
- Automatic JSON parsing and error handling
- Used throughout React components

Closes #110
```

---

**Last Updated:** Based on comprehensive codebase analysis
**Status:** 7 issues ready to close, 3 need review, 1 needs implementation

