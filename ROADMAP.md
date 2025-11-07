# Patient Polish Tutor - Implementation Roadmap

## Overview
This roadmap breaks down the Phase 1 implementation into 5 major phases with clear checkpoints and test points. Each checkpoint represents a working milestone that can be demonstrated and tested.

---

## Phase 0: Foundation & Setup (Week 1)

### Checkpoint 0.1: Project Structure & Environment ✅
**Goal:** Set up development environment and project structure

**Tasks:**
- [ ] Create project directory structure
- [ ] Set up Python virtual environment
- [ ] Create `requirements.txt` with all dependencies
- [ ] Create `.env` file template
- [ ] Set up `.gitignore`
- [ ] Initialize git repository
- [ ] Create basic README.md

**Test Points:**
- [ ] Virtual environment activates successfully
- [ ] All dependencies install without errors (`pip install -r requirements.txt`)
- [ ] Python version check passes (3.9+)
- [ ] Project structure matches specification

**Acceptance Criteria:**
- All dependencies from specification installed
- No import errors when importing main libraries
- `.env` file template created with all required variables

---

### Checkpoint 0.2: Database Schema & Migrations ✅
**Goal:** Database foundation ready

**Tasks:**
- [ ] Initialize Alembic migrations
- [ ] Create SQLAlchemy ORM models (Users, Lessons, Phrases, LessonProgress, Attempts, SRSMemory, Settings, Meta)
- [ ] Create initial Alembic migration
- [ ] Set up database connection handler
- [ ] Create database initialization script

**Test Points:**
- [ ] Alembic migrations run successfully (`alembic upgrade head`)
- [ ] All 8 tables created with correct schema
- [ ] Foreign key constraints enforced
- [ ] Indexes created correctly
- [ ] Database connection works
- [ ] Can insert/query test data

**Acceptance Criteria:**
- Database schema matches Feature 17 specification exactly
- All foreign keys and indexes present
- Meta table initialized with db_version = '1.0'

---

## Phase 1: Core Backend Infrastructure (Week 2-3)

### Checkpoint 1.1: FastAPI Application Skeleton ✅
**Goal:** Basic FastAPI app running

**Tasks:**
- [ ] Create `main.py` with FastAPI app instance
- [ ] Set up CORS middleware (localhost only)
- [ ] Create basic health check endpoint (`/health`)
- [ ] Set up logging configuration (RotatingFileHandler)
- [ ] Create AppContext class for dependency injection
- [ ] Set up static file serving for audio

**Test Points:**
- [ ] Server starts without errors (`uvicorn main:app --reload`)
- [ ] Health endpoint returns 200 OK
- [ ] CORS headers present in responses
- [ ] Logs written to `./logs/app.log`
- [ ] Static files accessible (test with dummy audio file)

**Acceptance Criteria:**
- Server runs on `http://localhost:8000`
- OpenAPI docs accessible at `/docs`
- Logging works with rotation (1MB, 7 backups)

---

### Checkpoint 1.2: Database Models & Services ✅
**Goal:** Database layer complete

**Tasks:**
- [ ] Implement all ORM models with relationships
- [ ] Create database service layer (`Database` class)
- [ ] Implement CRUD operations for all tables
- [ ] Add transaction management
- [ ] Create database session factory

**Test Points:**
- [ ] Unit tests for all CRUD operations pass
- [ ] Foreign key cascades work correctly
- [ ] Transactions rollback on errors
- [ ] Session management prevents leaks
- [ ] Can create/read/update/delete all entity types

**Acceptance Criteria:**
- All 8 tables have full CRUD support
- Database operations use transactions correctly
- No database connection leaks

---

### Checkpoint 1.3: Lesson Manager & JSON Loader ✅
**Goal:** Lesson data loading and validation

**Tasks:**
- [ ] Create `LessonManager` class
- [ ] Implement JSON schema validation (jsonschema)
- [ ] Create lesson JSON loader
- [ ] Implement branch validation
- [ ] Add audio file existence checks
- [ ] Create lesson caching mechanism

**Test Points:**
- [ ] Valid lesson JSON loads successfully
- [ ] Invalid JSON rejected with clear errors
- [ ] Branch integrity validated (all `next` IDs exist)
- [ ] Audio file paths validated
- [ ] Lessons cached after first load
- [ ] Unit tests for edge cases (missing fields, invalid branches)

**Acceptance Criteria:**
- Can load lesson from `./data/lessons/coffee_001.json`
- Invalid lessons rejected with helpful error messages
- Branch validation catches broken references

---

## Phase 2: Core Learning Features (Week 4-5)

### Checkpoint 2.1: Feedback Engine ✅
**Goal:** User input evaluation and feedback generation

**Tasks:**
- [ ] Create `FeedbackEngine` class
- [ ] Implement text normalization
- [ ] Implement similarity calculation (Levenshtein)
- [ ] Add phoneme comparison (phonemizer)
- [ ] Implement dynamic threshold calculation
- [ ] Create feedback message generation (high/medium/low)
- [ ] Add grammar explanation support

**Test Points:**
- [ ] Similarity scores calculated correctly
- [ ] Dynamic threshold adjusts for phrase length
- [ ] Feedback messages match tone library
- [ ] Phoneme comparison works for Polish text
- [ ] Unit tests for all score ranges (0.0-1.0)
- [ ] Edge cases handled (empty input, very long phrases)

**Acceptance Criteria:**
- Feedback matches specification (Feature 4)
- Score calculation uses formula: `0.85 - min(0.15, phrase_length / 200)`
- All three feedback types (high/medium/low) generate appropriate messages

---

### Checkpoint 2.2: SRS Manager ✅
**Goal:** Spaced repetition system functional

**Tasks:**
- [ ] Create `SRSManager` class
- [ ] Implement SM-2 algorithm (efactor, intervals)
- [ ] Add confidence slider impact calculation
- [ ] Create `schedule_next()` method
- [ ] Implement `get_due_items()` query
- [ ] Add quality-to-efactor mapping

**Test Points:**
- [ ] SM-2 calculations match specification exactly
- [ ] Initial efactor = 2.5
- [ ] Quality mapping (0-5) updates efactor correctly
- [ ] Confidence slider modifies intervals ±20%
- [ ] Due items query returns correct phrases
- [ ] Unit tests for all quality levels and confidence values

**Acceptance Criteria:**
- SRS algorithm matches Feature 6 specification
- Review intervals calculated correctly (1, 2, 5, 10, 20 days)
- Maximum interval capped at 365 days

---

### Checkpoint 2.3: Speech Engine (TTS) ✅
**Goal:** Text-to-speech working with fallbacks

**Tasks:**
- [ ] Create `SpeechEngine` class
- [ ] Implement audio priority order (pre-recorded → cached → pyttsx3 → cloud)
- [ ] Add cache key generation (MD5 hash)
- [ ] Implement pyttsx3 offline TTS
- [ ] Add gTTS integration (optional, online)
- [ ] Create audio cache management
- [ ] Implement speed adjustment (0.75×, 1.0×)

**Test Points:**
- [ ] Pre-recorded audio found and played
- [ ] Cache lookup works (hash-based)
- [ ] pyttsx3 generates audio offline
- [ ] Generated audio cached correctly
- [ ] Speed adjustment works (pydub)
- [ ] Fallback chain works (if pre-recorded missing, try cache, etc.)
- [ ] Unit tests for each priority level

**Acceptance Criteria:**
- Audio priority matches Feature 2 & 16 specification
- Offline TTS works without internet
- Cache reduces generation time on repeat requests

---

### Checkpoint 2.4: Tutor Class (Orchestration) ✅
**Goal:** Core conversation flow working

**Tasks:**
- [ ] Create `Tutor` class
- [ ] Implement `respond()` method
- [ ] Integrate LessonManager, FeedbackEngine, SRSManager
- [ ] Add attempt logging
- [ ] Implement branching logic
- [ ] Create response formatting

**Test Points:**
- [ ] Tutor responds to user input correctly
- [ ] Feedback generated and returned
- [ ] Attempts logged to database
- [ ] SRS updated after each attempt
- [ ] Branching works (exact → fuzzy → default)
- [ ] Response format matches API specification
- [ ] Integration tests for full conversation flow

**Acceptance Criteria:**
- Tutor class orchestrates all components correctly
- Response format matches Feature 14 API contract
- All attempts logged with scores and metadata

---

## Phase 3: API Layer (Week 6)

### Checkpoint 3.1: REST API Endpoints ✅
**Goal:** All REST endpoints implemented

**Tasks:**
- [ ] Implement `/chat/respond` (POST)
- [ ] Implement `/lesson/get` (GET)
- [ ] Implement `/lesson/options` (GET)
- [ ] Implement `/review/get` (GET)
- [ ] Implement `/review/update` (POST)
- [ ] Implement `/settings/get` (GET)
- [ ] Implement `/settings/update` (POST)
- [ ] Implement `/user/stats` (GET)
- [ ] Implement `/audio/generate` (POST)
- [ ] Implement `/backup/export` (GET)
- [ ] Implement `/error/report` (POST)
- [ ] Add Pydantic request/response models
- [ ] Add error handling (400, 404, 500)

**Test Points:**
- [ ] All endpoints return correct status codes
- [ ] Request validation works (Pydantic)
- [ ] Response format matches API contract
- [ ] Error responses follow specification format
- [ ] Integration tests for all endpoints
- [ ] Edge cases handled (missing data, invalid IDs)

**Acceptance Criteria:**
- All 12 endpoints from Feature 14 implemented
- Request/response formats match specification examples
- Error handling returns user-friendly messages

---

### Checkpoint 3.2: WebSocket Chat ✅
**Goal:** Real-time chat via WebSocket

**Tasks:**
- [ ] Implement `/ws/chat` WebSocket endpoint
- [ ] Add message type handling (message, typing, response)
- [ ] Implement streaming responses
- [ ] Add connection management
- [ ] Create WebSocket client example (JavaScript)
- [ ] Add reconnection logic

**Test Points:**
- [ ] WebSocket connection establishes
- [ ] Messages sent/received correctly
- [ ] Typing indicator works
- [ ] Streaming responses work
- [ ] Connection drops handled gracefully
- [ ] Multiple clients supported (Phase 1: single user)
- [ ] Integration tests with WebSocket client

**Acceptance Criteria:**
- WebSocket matches Feature 14 specification
- Streaming responses show typing indicator
- Fallback to HTTP polling if WebSocket unavailable

---

## Phase 4: Frontend & UI (Week 7-8)

### Checkpoint 4.1: Basic HTML/CSS Structure ✅
**Goal:** UI foundation ready

**Tasks:**
- [ ] Create HTML template structure
- [ ] Set up CSS variables (Feature 12)
- [ ] Implement chat bubble layout
- [ ] Add input bar with Send/Mic buttons
- [ ] Create message types (tutor, hint, info)
- [ ] Add accessibility attributes (ARIA labels)
- [ ] Implement dark mode CSS

**Test Points:**
- [ ] HTML validates (W3C validator)
- [ ] CSS variables work (light/dark mode)
- [ ] Chat bubbles display correctly
- [ ] Input bar accessible (keyboard navigation)
- [ ] ARIA labels present
- [ ] Responsive layout works
- [ ] Accessibility checklist passed (Feature UX section)

**Acceptance Criteria:**
- UI matches Feature 1 specification
- All accessibility requirements met
- Dark mode toggle works

---

### Checkpoint 4.2: Chat UI Functionality ✅
**Goal:** Interactive chat working

**Tasks:**
- [ ] Implement message sending (text input)
- [ ] Add WebSocket connection handling
- [ ] Create message rendering (tutor/learner)
- [ ] Implement typing indicator
- [ ] Add infinite scroll
- [ ] Create quick actions ("Repeat", "Explain why")
- [ ] Add connection status banner

**Test Points:**
- [ ] Messages send and display correctly
- [ ] WebSocket connects and maintains connection
- [ ] Typing indicator appears/disappears
- [ ] Scroll auto-updates to latest message
- [ ] Quick actions trigger correct API calls
- [ ] Connection status updates correctly
- [ ] Empty/long input validation works

**Acceptance Criteria:**
- Chat UI matches Feature 1 behavior
- All message types render correctly
- WebSocket integration works

---

### Checkpoint 4.3: Audio Playback ✅
**Goal:** Voice output working

**Tasks:**
- [ ] Implement audio playback button
- [ ] Add playback progress indicator
- [ ] Create speed toggle (0.75×, 1.0×)
- [ ] Implement auto-stop (new audio stops previous)
- [ ] Add audio error handling
- [ ] Create waveform visualization (optional)

**Test Points:**
- [ ] Audio plays when button clicked
- [ ] Speed adjustment works
- [ ] Previous audio stops when new starts
- [ ] Error handling shows text fallback
- [ ] Progress indicator updates
- [ ] Works with pre-recorded and generated audio

**Acceptance Criteria:**
- Audio playback matches Feature 2 specification
- Fallback to text if audio unavailable
- Speed preference persists

---

### Checkpoint 4.4: Voice Input (STT) ✅
**Goal:** Microphone input working

**Tasks:**
- [ ] Implement Web Speech API integration
- [ ] Add microphone permission request
- [ ] Create tap-to-toggle and push-to-talk modes
- [ ] Implement live caption ("You said...")
- [ ] Add auto-stop (2s silence)
- [ ] Create error handling (permission denied, noise)
- [ ] Add backend Whisper fallback (optional)

**Test Points:**
- [ ] Microphone permission requested correctly
- [ ] Speech recognition works (Web Speech API)
- [ ] Live caption updates during recording
- [ ] Auto-stop triggers after silence
- [ ] Error messages shown for failures
- [ ] Fallback to text input works
- [ ] Browser compatibility tested (Chrome, Firefox, Safari)

**Acceptance Criteria:**
- Voice input matches Feature 3 specification
- Graceful fallback if Web Speech API unavailable
- Error handling shows supportive messages

---

## Phase 5: Integration & Polish (Week 9-10)

### Checkpoint 5.1: Lesson Flow Integration ✅
**Goal:** Complete lesson flow working

**Tasks:**
- [ ] Integrate lesson loading with UI
- [ ] Implement lesson intro message
- [ ] Create dialogue loop (hear → respond → feedback → next)
- [ ] Add branching navigation
- [ ] Implement wrap-up summary
- [ ] Create mini-quiz (2-3 questions)
- [ ] Add lesson completion tracking

**Test Points:**
- [ ] Lesson loads and displays correctly
- [ ] Dialogue loop works end-to-end
- [ ] Branching follows user input
- [ ] Summary shows at lesson end
- [ ] Quiz questions work
- [ ] Progress saved after each turn
- [ ] Can replay or skip without penalty

**Acceptance Criteria:**
- Complete lesson flow matches Feature 5 specification
- One lesson playable end-to-end (Definition of Done)

---

### Checkpoint 5.2: Settings & Personalization ✅
**Goal:** Settings system complete

**Tasks:**
- [ ] Create settings UI
- [ ] Implement all settings (speed, translation, mic mode, tutor mode, voice, theme)
- [ ] Add profile templates (Kid/Adult/Teacher)
- [ ] Implement settings persistence
- [ ] Create settings export/import
- [ ] Add reset functionality

**Test Points:**
- [ ] All settings save correctly
- [ ] Settings persist across restarts
- [ ] Profile templates apply correctly
- [ ] Export/import works
- [ ] Reset clears data correctly
- [ ] Settings affect app behavior immediately

**Acceptance Criteria:**
- Settings match Feature 7 specification
- Settings persist across restarts (Definition of Done)

---

### Checkpoint 5.3: Review System Integration ✅
**Goal:** SRS review queue working

**Tasks:**
- [ ] Create review queue UI
- [ ] Implement daily scheduler check
- [ ] Add browser notifications
- [ ] Create review attempt interface
- [ ] Implement confidence slider
- [ ] Add review completion tracking
- [ ] Create "forgotten items" reinjection

**Test Points:**
- [ ] Review queue shows due items
- [ ] Daily scheduler triggers correctly
- [ ] Browser notifications work
- [ ] Confidence slider updates intervals
- [ ] Reviews update SRS correctly
- [ ] Forgotten items added to next lesson
- [ ] Review batch ≤ 5 minutes

**Acceptance Criteria:**
- Review system matches Feature 6 specification
- SRS review queue generates daily tasks (Definition of Done)

---

### Checkpoint 5.4: Session Management ✅
**Goal:** Session persistence working

**Tasks:**
- [ ] Implement session snapshots
- [ ] Add auto-save (after each response, every 30s)
- [ ] Create resume functionality
- [ ] Implement multi-profile support
- [ ] Add crash recovery
- [ ] Create session history archive

**Test Points:**
- [ ] Sessions save correctly
- [ ] Auto-save triggers at correct intervals
- [ ] Resume loads last session
- [ ] Multi-profile switching works
- [ ] Crash recovery restores state
- [ ] Session history archived weekly

**Acceptance Criteria:**
- Session management matches Feature 19 specification
- Can resume exactly where left off

---

### Checkpoint 5.5: Error Handling & Logging ✅
**Goal:** Robust error handling

**Tasks:**
- [ ] Implement error categories (speech, audio, database, etc.)
- [ ] Add user-friendly error messages
- [ ] Create error recovery actions
- [ ] Implement offline queue
- [ ] Add developer diagnostics toggle
- [ ] Create error reporting endpoint

**Test Points:**
- [ ] All error types show appropriate messages
- [ ] Recovery actions work (retry, fallback)
- [ ] Offline queue stores and syncs events
- [ ] Logging captures all errors
- [ ] Developer mode shows raw logs
- [ ] Error reporting endpoint works

**Acceptance Criteria:**
- Error handling matches Feature 18 specification
- All error categories handled with user-friendly messages

---

## Phase 6: Testing & Quality Assurance (Week 11)

### Checkpoint 6.1: Unit Tests ✅
**Goal:** Core modules tested

**Tasks:**
- [ ] Write unit tests for LessonManager
- [ ] Write unit tests for FeedbackEngine
- [ ] Write unit tests for SRSManager
- [ ] Write unit tests for SpeechEngine
- [ ] Write unit tests for Tutor
- [ ] Achieve >80% code coverage

**Test Points:**
- [ ] All unit tests pass
- [ ] Code coverage ≥80%
- [ ] Edge cases covered
- [ ] Mock dependencies used correctly

**Acceptance Criteria:**
- Unit tests pass (Definition of Done)
- Coverage report shows ≥80%

---

### Checkpoint 6.2: Integration Tests ✅
**Goal:** API endpoints tested

**Tasks:**
- [ ] Write integration tests for all REST endpoints
- [ ] Write WebSocket integration tests
- [ ] Test with mocked speech services
- [ ] Test error scenarios
- [ ] Test authentication (if implemented)

**Test Points:**
- [ ] All integration tests pass
- [ ] Endpoints return correct schemas
- [ ] Error responses tested
- [ ] WebSocket tests pass

**Acceptance Criteria:**
- Integration tests pass (Definition of Done)
- All endpoints return schema-compliant JSON

---

### Checkpoint 6.3: UI Smoke Tests ✅
**Goal:** End-to-end UI flows tested

**Tasks:**
- [ ] Create Cypress/Playwright test suite
- [ ] Test voice-only session flow
- [ ] Test text-only session flow
- [ ] Test offline resume flow
- [ ] Test branch navigation
- [ ] Test settings changes

**Test Points:**
- [ ] All smoke tests pass
- [ ] Voice-only flow works
- [ ] Text-only flow works
- [ ] Offline resume works
- [ ] Branching works correctly

**Acceptance Criteria:**
- UI smoke tests pass (Definition of Done)
- Manual smoke list completed

---

### Checkpoint 6.4: Performance Testing ✅
**Goal:** Performance targets met

**Tasks:**
- [ ] Measure TTS latency (target: ≤1500ms pre-recorded, ≤2500ms synth)
- [ ] Measure STT latency (target: ≤1800ms offline)
- [ ] Measure UI response time (target: ≤300ms)
- [ ] Test database query performance
- [ ] Test under load (single user for Phase 1)

**Test Points:**
- [ ] TTS latency within targets
- [ ] STT latency within targets
- [ ] UI response time within targets
- [ ] Database queries <100ms
- [ ] Memory usage reasonable (<200MB base)

**Acceptance Criteria:**
- All performance targets from Feature KPIs met
- Application responsive under normal use

---

## Final Checkpoint: Definition of Done ✅

### All Phase 1 Requirements Met

**Verification Checklist:**
- [ ] One complete lesson playable end-to-end (chat + audio + feedback + quiz)
- [ ] Voice mode toggle verified offline (Whisper) and online (Web Speech API)
- [ ] SRS review queue generates daily tasks and records outcomes
- [ ] All endpoints return schema-compliant JSON with status metadata
- [ ] Settings persist across restarts and profile switches
- [ ] Automated tests pass (unit + integration) and manual smoke list completed

**Final Deliverables:**
- [ ] Working application running on localhost:8000
- [ ] Complete test suite with >80% coverage
- [ ] Documentation (README, API docs)
- [ ] Deployment instructions
- [ ] Troubleshooting guide reference

---

## Timeline Summary

- **Week 1:** Foundation & Setup (Phase 0)
- **Week 2-3:** Core Backend Infrastructure (Phase 1)
- **Week 4-5:** Core Learning Features (Phase 2)
- **Week 6:** API Layer (Phase 3)
- **Week 7-8:** Frontend & UI (Phase 4)
- **Week 9-10:** Integration & Polish (Phase 5)
- **Week 11:** Testing & QA (Phase 6)

**Total Estimated Time:** 11 weeks for Phase 1 MVP

---

## Risk Mitigation

**High Risk Areas:**
1. **Speech Recognition:** Web Speech API browser compatibility
   - Mitigation: Text-only fallback, backend Whisper option
2. **Audio Generation:** pyttsx3 quality for Polish
   - Mitigation: Pre-recorded audio priority, cloud TTS fallback
3. **SRS Algorithm:** SM-2 tuning for beginners
   - Mitigation: Adjustable parameters, confidence slider

**Dependencies:**
- External: Web Speech API (browser), pyttsx3 (system TTS)
- Internal: All checkpoints build on previous phases

---

## Success Metrics

- **Functionality:** All 19 features implemented
- **Quality:** >80% test coverage, all tests passing
- **Performance:** All KPIs met (latency, response times)
- **Usability:** One complete lesson playable end-to-end
- **Reliability:** Settings persist, sessions resume correctly

