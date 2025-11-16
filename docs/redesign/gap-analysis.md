# Patient Polish Tutor — GAP Analysis (v2 Roadmap Alignment)

*Last updated: 2025-11-14*

This document compares the existing repository against the v2 UI Redesign Roadmap and enumerates the required changes for frontend, backend, database, and conversation logic.

---

## 1. Frontend Gap Summary

| Planned Component / Feature | Current State | Gap |
| --- | --- | --- |
| Chat-based Lesson UI (`LessonChatPage`) | Legacy Jinja preview renders full lesson statically | Rebuild as React SPA |
| Tutor / User message bubbles | Not implemented | Build `TutorMessage`, `UserMessage`, `FeedbackMessage` |
| Phrase-by-phrase flow | Entire lesson shown at once | Implement state machine with `currentPhraseIndex` |
| Mic recording + playback controls | Limited button stubs, no recording pipeline | Introduce `MicButton`, connect to STT endpoint (Phase B) |
| Typing indicator, auto-scroll | Not present | Add `TypingIndicator`, chat container auto-scroll |
| Scoring & feedback overlays | Not present | Add `ScoreBadge`, star pulses, success/fail states |
| Key phrase drill upgrades | Static list with play buttons | Extend with mic, scoring, expand/collapse, history |
| End-of-lesson summary | Not present | Build `LessonSummaryPage` with stats and next-step buttons |

**Action:** Begin Phase A — React component implementation (see roadmap).

---

## 2. Backend Gap Summary

| Planned Endpoint | Current State | Gap |
| --- | --- | --- |
| `POST /speech/recognize` | Missing | Add Whisper STT endpoint |
| `POST /evaluate` | Missing | Add pronunciation + semantic scoring route |
| `GET /lesson/{id}/next` | Missing | Add phrase-by-phrase fetch |
| Evaluation pipeline | None | Implement scoring engine (phonetic, semantic, hints) |
| Adaptive progression | None | Add state machine + lesson context |

**Action:** Phase B — build STT/evaluation endpoints after UI requirements are solid.

---

## 3. Database Gap Summary

| Planned Table | Current State | Gap |
| --- | --- | --- |
| `phrase_attempts` | Missing | Track per-phrase attempts & scores |
| `user_progress` | Missing | Store lesson completion, CEFR level |
| `user_stats` | Partially covered via SRS | Extend with speaking metrics |
| `daily_reviews` | Missing | Support spaced repetition scheduling |
| `cached_audio` metadata | Missing | Persist generated audio references |

**Field Guidelines (from roadmap)**  
`score` (float 0–1), `phonetic_distance`, `semantic_accuracy`, `response_time` (ms), `timestamp`, `audio_ref`.

**Action:** Phase C — add models + Alembic migrations.

---

## 4. Conversation / State Machine Gaps

Current app has no conversation engine. Planned state machine:

```
TUTOR_SPEAKING → WAITING_FOR_USER → RECORDING → EVALUATING → FEEDBACK → NEXT_PHRASE → …
```

Missing pieces:

* Tutor typing delay + audio playback triggers
* User recording lifecycle
* Evaluation feedback loops (retry vs advance)
* Adaptive hints & difficulty progression
* CEFR tracking logic

**Action:**  
* Phase A — implement UI state machine + mock data provider  
* Phase B — connect to real scoring endpoints  
* Phase C — persist progress metrics

---

## 5. Migration & Coexistence Notes

* Maintain current Jinja dashboard for preview-only use during Phase A.
* Serve React SPA under `/app/*` via new `frontend-react` bundle.
* Plan controlled switchover once React chat UI reaches feature parity.

---

## 6. Recommended Next Steps

1. Create `frontend-react/` using **Vite + React + TypeScript + TailwindCSS**.
2. Implement Phase A components + state machine using mock lesson provider.
3. Add backend STT/evaluation endpoints (Phase B) aligned with roadmap API contracts.
4. Introduce database tables via Alembic migrations (Phase C).
5. Layer advanced UI enhancements (Phase D) once scoring data is available.

This GAP analysis should be updated after each phase to track progress against the roadmap.
