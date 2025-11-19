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

        return EvaluationResult(
            score=round(score, 2),
            feedback=feedback,
            hint=hint,
            passed=passed,
            next_action="advance" if passed else "retry",
            phonetic_similarity=score,
            semantic_accuracy=score,
        )
