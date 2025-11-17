# Patient Polish Tutor — GAP Analysis (v2 Roadmap Alignment)
*Last updated: 2025-11-16*

This document evaluates the current repository against the v2 UI Redesign Roadmap, documenting which Phase A items are complete and what gaps remain for Phases B–D.

---

## 1. Frontend Gap Summary (Phase A Complete)

| Planned Component / Feature | Current State | Gap (Future Phases) |
| --- | --- | --- |
| Chat-based Lesson UI (`LessonChatPage`) | **Implemented** — React SPA, routing, layout, state machine | Add backend integration (Phase B) |
| Tutor/User/Feedback messages | **Implemented** — all bubble components in place | Add animations & CEFR visual cues (Phase D) |
| Phrase-by-phrase flow | **Implemented** — mock provider + lesson machine | Connect to `/lesson/{id}/next` API (Phase B) |
| Mic recording + playback | **Mock implemented** — mock mic + mock evaluator | Connect real STT + evaluation (Phase B) |
| Typing indicator & auto-scroll | **Implemented** | Add micro-animations (Phase D) |
| Scoring overlays | **Basic UI implemented** | Add star ratings + animations (Phase D) |
| Key phrase drills | **Implemented** | Add scoring history & mic scoring (Phase D) |
| End-of-lesson summary | **Implemented** | Add CEFR badges + XP (Phase D) |

**Summary:**  
**Phase A frontend is 100% complete.**  
All remaining frontend gaps belong to Phases B–D.

---

## 2. Backend Gap Summary (Phase B Next)

| Planned Endpoint | Current State | Gap |
| --- | --- | --- |
| `POST /api/v2/speech/recognize` | Missing | Implement Whisper STT service |
| `POST /api/v2/evaluate` | Missing | Implement evaluator (phonetic + semantic scoring) |
| `GET /api/v2/lesson/{id}/next` | Missing | Backend phrase progression engine |
| Evaluation pipeline | None | Build phonetic distance + semantic accuracy pipeline |
| Adaptive progression | None | Add lesson context + difficulty tracking |

**Summary:**  
UI is ready. Backend must now implement Phase B endpoints.

---

## 3. Database Gap Summary (Phase C)

| Planned Table | Current State | Gap |
| --- | --- | --- |
| `phrase_attempts` | Missing | Track per-phrase attempts & scoring |
| `user_progress` | Missing | Store lesson completion + CEFR level |
| `user_stats` | Partial SRS logic present | Extend with speaking metrics |
| `daily_reviews` | Missing | Add spaced repetition scheduler |
| `cached_audio` | Missing | Track Murf/Whisper audio references |

**Action:**  
Implement SQLAlchemy models + Alembic migrations in Phase C.

---

## 4. Conversation / State Machine Gaps

Phase A includes a working **mock-only** state machine. Missing features for later phases:

- Real STT → evaluation → scoring loop  
- Retry/advance logic driven by backend  
- Persistent attempt history  
- CEFR/XP progression  
- Advanced feedback animations (pulse, shake)

**Action:**  
Phase B and Phase C will replace mocks with real logic.

---

## 5. Migration & Coexistence Notes

- Jinja UI remains temporarily for preview.  
- React SPA lives under `frontend-react/` and is served via `/app/*`.  
- No legacy templates were modified in Phase A.  
- Full switchover occurs after Phase B–D are complete.

---

## 6. Recommended Next Steps

1. **Begin Phase B** — Implement `/speech/recognize`, `/evaluate`, and `/lesson/{id}/next` under `/api/v2`.  
2. Connect React UI to new endpoints (replace mocks without UI redesign).  
3. **Phase C** — Add SQL models + migrations.  
4. **Phase D** — Add advanced UI/UX (animations, CEFR dashboard, scoring stars, adaptive hints).

---

This GAP Analysis is now aligned with the v2.0.1 roadmap and the completed Phase A implementation.

### END OF FILE
