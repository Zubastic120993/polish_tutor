---
title: UX Roadmap – Patient Polish Tutor
description: Follow-on improvements for onboarding, lesson selection, dialogue clarity, and motivation.
updated: 2025-11-16
---

## Sprint 0 – Visual Refresh & Starter Flow
1. **Homepage Hierarchy**
   - Split layout into three panels (Lesson Library / Active Lesson / Chat).
   - Add “Ready to learn Polish? Pick a lesson and press ▶ Start” banner.
2. **Typography & Colors**
   - Adopt Inter (headings/body) with consistent sizes (xl/headline, base, sm).
   - Update palette: cream background, muted navy chat area, green CTA.
3. **Buttons & Icons**
   - Replace emojis with consistent icon set (Lucide/Font Awesome).
   - Standardize button sizes, add hover/focus states.
4. **Current Lesson Summary**
   - Restructure to `Lesson • Goal • Est. time • Progress bar` card placed near chat header.

## Sprint 1 – First-Run Experience & Lesson Selection
1. **Guided Onboarding**
   - Add a three-step “Start Here” overlay (Choose lesson → Press ▶ Start → Answer).
   - Optional looping animation / GIF to demonstrate the flow.
2. **Lesson Picker Refresh**
   - Group lessons via `<optgroup>` (A1: Daily Life, A1: Work, etc.).
   - Surface “Recent / Recommended” lessons and add search/filter input.
   - Show metadata (goal, time) inside the preview card.

## Sprint 2 – Current Lesson & Helper Actions
1. **Current Lesson Card**
   - Consolidate into a single block: `🧮 Lesson • 🎯 Goal • ⏱ Est. time • Progress bar`.
   - Replace static “Lesson in progress” chip with Start/Continue/Done toggle.
2. **Helper/Audio Controls**
   - Group helper buttons by function (Audio • Help • Lesson) with tooltips.
   - Add hover/active states to improve discoverability.
3. **Voice Status Indicator**
   - Introduce animated mic glow plus “Processing…” state after speech input.

## Sprint 3 – Tutor Interaction & Feedback
1. **Dialogue Zone**
   - Distinct chat bubbles, avatars, and chronological timeline.
   - Input placeholder: “Type your reply in Polish or press 🎤 to speak…”
   - Add “Processing your answer…” status after voice input.
2. **Live Feedback Deck**
   - Add “✅ Correct / 🔁 Try again” tags with inline hints or translations.
   - Show cultural notes from 🍩 button as inline bubble.
3. **Tone & Copy**
   - Warm up tutor prompts (“Cześć! 😊 Ready to practice numbers?”) with bilingual hints.

## Sprint 4 – Motivation, Stats & Responsiveness
1. **Progress & Streak**
   - Move streak/time to the header with icons (“🔥 3-day streak”).
   - Add a CTA to view detailed stats dashboard.
2. **Responsive Layout**
   - Three-panel layout on desktop (Sidebar / Chat / Stats); single-column on mobile.
   - Ensure 44×44 touch targets and responsive font scaling.
3. **Optional Enhancements**
   - Audio waveform visualization.
   - Mini-quizzes after every 3 dialogues.
   - Light/dark theme toggle.

> _Keep this roadmap updated as each sprint completes; link tasks back to the main PROGRESS tracker._
