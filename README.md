# 🇵🇱 Patient Polish Tutor

An AI-assisted conversational tutor for learning spoken Polish (A0 → A1 level).

## 📋 Project Status

**Phase:** Core Learning Features (Phase 2)  
**Current Checkpoint:** 2.4 - Tutor Class (Orchestration)  
**Progress:** 32% (8/25 checkpoints complete)

See [PROGRESS.md](PROGRESS.md) for detailed tracking.

## 🎯 Project Overview

Patient Polish Tutor is a locally-hosted FastAPI application that teaches practical spoken Polish through:
- Interactive micro-dialogues
- Voice and text input
- Adaptive spaced repetition (SRS)
- Patient, encouraging feedback
- Offline-first functionality

## 📚 Documentation

- **[SPECIFICATION.md](SPECIFICATION.md)** - Complete technical specification
- **[ROADMAP.md](ROADMAP.md)** - Implementation roadmap with checkpoints
- **[PROGRESS.md](PROGRESS.md)** - Current progress tracker
- **[IMPROVEMENTS_SUMMARY.md](IMPROVEMENTS_SUMMARY.md)** - Summary of spec improvements

## 🚀 Quick Start

### Requirements

- Python 3.9+ (3.10+ recommended)
- macOS, Linux, or Windows (WSL recommended)
- Modern browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)

### Installation

```bash
# 1. Clone the repository
cd pol_app

# 2. Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Initialize database
alembic upgrade head

# 5. Run the application
uvicorn main:app --reload
```

Access the application at `http://localhost:8000`

## 🏗️ Project Structure

```
pol_app/
├── src/
│   ├── api/          # FastAPI routes
│   ├── core/         # Core business logic (Tutor, LessonManager, etc.)
│   ├── models/       # Database ORM models
│   ├── services/     # Service layer (FeedbackEngine, SRSManager, etc.)
│   └── utils/        # Utility functions
├── tests/
│   ├── unit/         # Unit tests
│   └── integration/  # Integration tests
├── data/
│   ├── lessons/      # Lesson JSON files
│   └── backups/      # Database backups
├── static/
│   ├── audio/        # Audio files (pre-recorded and cached)
│   ├── css/          # Stylesheets
│   └── js/           # JavaScript files
├── logs/             # Application logs
├── migrations/       # Alembic database migrations
└── sessions/         # Session snapshots
```

## 🔧 Development

### Git Workflow

Track progress with git commits:

```bash
# After completing a checkpoint
git add PROGRESS.md STATUS.json [changed-files]
git commit -m "✅ Checkpoint X.X: [Name] complete"
git tag checkpoint-X.X
git push origin main --tags
```

### Running Tests

```bash
# Unit tests
pytest tests/unit/ -v

# Integration tests
pytest tests/integration/ -v

# All tests with coverage
pytest tests/ -v --cov=src
```

### Code Quality

```bash
# Format code
black src/ tests/

# Lint
flake8 src/ tests/

# Type check
mypy src/
```

## 🎓 Learning Features

### Phase 1 (MVP) Includes:
- ✅ 10 starter lesson packs (A0 level)
- ✅ Voice and text input
- ✅ Offline TTS with pyttsx3
- ✅ Spaced repetition system (SM-2)
- ✅ Real-time feedback
- ✅ Progress tracking
- ✅ Settings persistence

## 📊 Progress Tracking

- **PROGRESS.md** - Manual checklist (update as you complete tasks)
- **STATUS.json** - Machine-readable state (update programmatically)
- **Git tags** - Checkpoint-X.X tags mark milestone completions

## 🤝 Contributing

This is a Phase 1 MVP implementation following a detailed specification.  
See [ROADMAP.md](ROADMAP.md) for planned features and checkpoints.

## 📄 License

[To be determined]

## 🔗 Resources

- [CEFR Framework](https://www.coe.int/en/web/common-european-framework-reference-languages)
- [SM-2 Algorithm](https://en.wikipedia.org/wiki/SuperMemo#Description_of_SM-2_algorithm)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)

---

**Current Version:** 0.1.0-dev  
**Target Release:** Phase 1 MVP (11 weeks)

---

## ✅ Completed Checkpoints

- ✅ **0.1** - Project Structure & Environment
- ✅ **0.2** - Database Schema & Migrations
- ✅ **1.1** - FastAPI Application Skeleton
- ✅ **1.2** - Database Models & Services
- ✅ **1.3** - Lesson Manager & JSON Loader
- ✅ **2.1** - Feedback Engine
- ✅ **2.2** - SRS Manager
- ✅ **2.3** - Speech Engine (TTS)

**Phase 0:** Complete (2/2 checkpoints)  
**Phase 1:** Complete (3/3 checkpoints)  
**Phase 2:** In Progress (3/4 checkpoints)

