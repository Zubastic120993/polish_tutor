# **Patient Polish Tutor — Phase C DB Instructions (v2.2.0)**

*Migration*: `13479edb7ec9_phase_c_v2_schema_attempts_progress_...`  
*Scope*: Finish Phase C by adding persistent storage for scoring + lessons.

---

## ✅ What’s Already Done
- SQLAlchemy models live under `src/models/v2/` (`PhraseAttempt`, `UserProgress`, `UserStats`, `DailyReview`, `CachedAudio`)
- Alembic migration `13479edb7ec9` creates all tables with UUID PKs + timezone-aware timestamps
- `migrations/env.py` imports `src.models.v2.*` so new tables autogenerate cleanly
- Default DB is SQLite (`DATABASE_URL=sqlite:///./data/polish_tutor.db`) but schema is Postgres-ready

---

## 📦 Storage Strategy
1. **Attempts** — persist STT/evaluation results per phrase attempt with phonetic + semantic scores, latencies, audio refs  
2. **Progress** — per-user lesson index, totals, CEFR level snapshot  
3. **Stats** — aggregated XP, streak, total attempts/passes for dashboard badges  
4. **Daily Reviews** — spaced repetition queue (next review time, interval, easiness)  
5. **Cached Audio** — hash → audio_ref mapping so Murf/Whisper responses are reusable

> **Important:** No raw audio binaries are stored in DB. Only metadata/refs belong in `cached_audio`.

---

## 🧭 How Cursor Should Work in Phase C
- **Only** touch Phase B/C folders: `src/api/routers/v2`, `src/services/`, `src/models/v2/`, `src/schemas/v2/`
- Use SQLAlchemy sessions via `src.core.database.SessionLocal`
- Writes go through new models; no direct SQL
- Stick to timezone-aware `DateTime(timezone=True)` columns
- Always autogenerate Alembic migrations after touching models (`alembic revision --autogenerate ...`)
- Run `alembic upgrade head` locally to verify
- Keep migrations idempotent; no data backfills yet

---

## 🚀 Next Steps Toward Phase D
1. **Persist Evaluation Results** — connect `EvaluationService` to `PhraseAttempt` + `UserStats`
2. **Track Lesson Flow** — lesson progression endpoint should update `UserProgress` (current index, totals)
3. **Seed Daily Reviews** — each pass should enqueue a `DailyReview` row with default interval/easiness
4. **Surface XP/Badges** — React UI will consume `user_stats` + `user_progress` for CEFR + streak visuals
5. **Cache Audio** — future Murf/STT jobs should upsert entries in `cached_audio`

Cursor must keep DB writes simple and synchronous until Phase D introduces background workers.
