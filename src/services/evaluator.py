"""Evaluation service implementing LLM-driven semantic scoring (stable & tolerant)."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
from dataclasses import dataclass
from typing import Any, Dict, Optional

from openai import OpenAI

logger = logging.getLogger(__name__)


# =====================================================================
# Data model
# =====================================================================


@dataclass
class EvaluationResult:
    score: float
    feedback: str
    hint: str
    passed: bool
    next_action: str
    phonetic_similarity: float
    semantic_accuracy: float
    difficulty: str
    error_type: Optional[str]
    recommendation: str
    focus_word: Optional[str]

    @property
    def phonetic_distance(self) -> float:
        return max(0.0, 1.0 - self.phonetic_similarity)

    def response_payload(self) -> Dict[str, Any]:
        return {
            "score": self.score,
            "feedback": self.feedback,
            "hint": self.hint,
            "passed": self.passed,
            "next_action": self.next_action,
            "difficulty": self.difficulty,
            "error_type": self.error_type,
            "recommendation": self.recommendation,
            "focus_word": self.focus_word,
        }


# =====================================================================
# Evaluation Service
# =====================================================================


class EvaluationService:
    """Robust, JSON-safe LLM evaluator with tolerance for Whisper glitches."""

    def __init__(self, openai_client: Optional[OpenAI] = None):
        self._openai_client = openai_client or self._init_openai_client()

    def _init_openai_client(self) -> Optional[OpenAI]:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            logger.error("OPENAI_API_KEY not set — LLM scoring disabled")
            return None

        try:
            return OpenAI(api_key=api_key)
        except Exception as exc:
            logger.error("Failed to create OpenAI client: %s", exc)
            return None

    @staticmethod
    def _extract_json(text: str) -> Dict[str, Any]:
        """
        Safely extract JSON from model output.
        Handles cases where the response contains text + JSON blob.
        """
        try:
            # If pure JSON
            return json.loads(text)
        except Exception:
            pass

        # Fallback: extract using regex
        match = re.search(r"\{.*\}", text, flags=re.DOTALL)
        if not match:
            raise ValueError("No JSON found in LLM output")

        return json.loads(match.group(0))

    @staticmethod
    def _clamp(value: float) -> float:
        return max(0.0, min(1.0, float(value)))

    @staticmethod
    def _extract_focus_word(text: str) -> Optional[str]:
        """Attempt to pull a focus word from evaluator reason text."""
        if not text:
            return None
        # Prefer quoted fragments such as "słowo"
        quote_match = re.search(r"[\"“”'‘’](.+?)[\"“”'‘’]", text)
        if quote_match:
            focus = quote_match.group(1).strip()
            if focus and " " not in focus:
                return focus
        # fallback: pick last single word mentioned after keywords
        for keyword in ("word", "słowo", "wyraz"):
            idx = text.lower().find(keyword)
            if idx != -1:
                fragment = text[idx + len(keyword) :].strip()
                candidate = fragment.split()[0] if fragment else ""
                candidate = re.sub(r"[^A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻż-]", "", candidate)
                if candidate:
                    return candidate
        return None

    @classmethod
    def _infer_midrange_metadata(cls, reason: str):
        """Return (error_type, recommendation, focus_word) for mid scores."""
        reason_lower = (reason or "").lower()
        focus_word = None

        if any(
            keyword in reason_lower for keyword in ("pronunciation", "accent", "akcent")
        ):
            return "pronunciation", "slow_down", None

        if any(
            keyword in reason_lower
            for keyword in ("wrong word", "word choice", "słowo", "wyraz")
        ):
            focus_word = cls._extract_focus_word(reason)
            return "word_choice", "repeat_focus_word", focus_word

        if any(keyword in reason_lower for keyword in ("missing", "brakuje")):
            return "missing_word", "repeat_core", None

        if "order" in reason_lower or "kolejność" in reason_lower:
            return "order", "repeat_core", None

        # Default mid-range guidance
        return "missing_word", "repeat_core", None

    # =====================================================================
    # Synchronous LLM scoring (run in thread pool)
    # =====================================================================

    def _llm_score_sync(self, expected: str, user: str):
        """
        Calls LLM and returns (score, passed, reason)
        """

        if not self._openai_client:
            return 0.5, False, "fallback"

        system_msg = (
            "You are a Polish language evaluator.\n"
            "Judge whether USER utterance conveys the same MEANING as EXPECTED.\n"
            "Rules:\n"
            "- Accept repetitions (e.g. 'Cześć, cześć!').\n"
            "- Accept stuttering, filler syllables, Whisper artifacts.\n"
            "- Accept minor grammar differences if meaning is identical.\n"
            "- Focus ONLY on meaning, not perfect wording.\n"
            "- Return STRICT JSON with fields: semantic_accuracy, reason.\n"
            "semantic_accuracy is 0.0–1.0.\n"
        )

        user_msg = json.dumps({"expected": expected, "user": user}, ensure_ascii=False)

        try:
            response = self._openai_client.chat.completions.create(
                model="gpt-4o-mini",
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": system_msg},
                    {"role": "user", "content": user_msg},
                ],
            )

            raw = response.choices[0].message.content
            payload = self._extract_json(raw)

            if "semantic_accuracy" not in payload:
                raise ValueError("semantic_accuracy missing")

            score = self._clamp(payload["semantic_accuracy"])
            passed = score >= 0.75  # new smarter threshold
            reason = payload.get("reason", "")

            return score, passed, reason

        except Exception as exc:
            logger.warning("LLM eval failed: %s", exc)
            return 0.5, False, "fallback"

    # =====================================================================
    # Async public wrapper
    # =====================================================================

    async def llm_score(self, expected: str, user: str):
        return await asyncio.to_thread(self._llm_score_sync, expected, user)

    # =====================================================================
    # Main evaluation entrypoint
    # =====================================================================

    def evaluate(self, target_phrase: str, user_transcript: str) -> EvaluationResult:
        """Evaluate using stable LLM scoring with JSON extraction."""

        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                import concurrent.futures

                with concurrent.futures.ThreadPoolExecutor() as ex:
                    fut = ex.submit(
                        asyncio.run, self.llm_score(target_phrase, user_transcript)
                    )
                    score, passed, reason = fut.result()
            else:
                score, passed, reason = loop.run_until_complete(
                    self.llm_score(target_phrase, user_transcript)
                )
        except Exception as exc:
            logger.error("LLM score failed: %s", exc)
            score, passed, reason = 0.5, False, "fallback"

        # Construct messages
        feedback = (
            reason
            if reason not in ("fallback", "")
            else "Nie mogę ocenić odpowiedzi. Spróbuj ponownie."
        )

        if passed:
            hint = "Świetnie! Powtarzaj dla utrwalenia."
        elif score >= 0.6:
            hint = "Jest blisko! Zwróć uwagę na akcent i płynność."
        else:
            hint = "Powtórz zdanie powoli, akcentując polskie znaki."

        if score >= 0.85:
            difficulty = "easy"
            recommendation = "proceed"
            error_type = None
            focus_word = None
        elif score >= 0.6:
            difficulty = "medium"
            error_type, recommendation, focus_word = self._infer_midrange_metadata(
                reason
            )
        else:
            difficulty = "hard"
            recommendation = "full_retry"
            reason_lower = (reason or "").lower()
            if "order" in reason_lower or "kolejność" in reason_lower:
                error_type = "order"
            else:
                error_type = "missing_word"
            focus_word = None

        return EvaluationResult(
            score=round(score, 2),
            feedback=feedback,
            hint=hint,
            passed=passed,
            next_action="advance" if passed else "retry",
            phonetic_similarity=score,
            semantic_accuracy=score,
            difficulty=difficulty,
            error_type=error_type,
            recommendation=recommendation,
            focus_word=focus_word,
        )
