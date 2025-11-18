"""Evaluation service implementing pronunciation + semantic scoring."""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict, Optional, Tuple

from openai import OpenAI
from rapidfuzz.distance import Levenshtein

logger = logging.getLogger(__name__)


class EvaluationService:
    """Compute pronunciation, semantic, and overall scores for a phrase."""

    PRONUNCIATION_WEIGHT = 0.6
    SEMANTIC_WEIGHT = 0.4
    PASS_THRESHOLD = 0.75

    def __init__(self, openai_client: Optional[OpenAI] = None) -> None:
        self._openai_client = openai_client or self._init_openai_client()

    def _init_openai_client(self) -> Optional[OpenAI]:
        """Initialize OpenAI client if API key is configured."""
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            logger.warning(
                "OPENAI_API_KEY not set — semantic scoring will use fallback heuristics"
            )
            return None

        try:
            return OpenAI(api_key=api_key)
        except Exception as exc:  # pragma: no cover - best effort initialization
            logger.warning("Failed to initialize OpenAI client: %s", exc)
            return None

    @staticmethod
    def _normalize(text: str) -> str:
        return (text or "").strip().lower()

    @staticmethod
    def _clamp_score(value: float) -> float:
        return max(0.0, min(1.0, float(value)))

    def _phonetic_score(self, target_phrase: str, user_transcript: str) -> float:
        expected = self._normalize(target_phrase)
        attempt = self._normalize(user_transcript)
        if not expected or not attempt:
            return 0.0
        score = Levenshtein.normalized_similarity(expected, attempt)
        return self._clamp_score(score)

    def _fallback_feedback(self, score: float) -> Tuple[str, str]:
        """Provide human-friendly feedback without LLM support."""
        if score >= 0.85:
            return (
                "Świetna wymowa i dobry sens zdania!",
                "Kontynuuj naukę kolejnych fraz.",
            )
        if score >= 0.6:
            return (
                "Niezły wynik, ale warto dopracować wymowę i słownictwo.",
                "Zwróć uwagę na akcent i długość samogłosek.",
            )
        return (
            "Fraza różni się od oczekiwanej. Spróbuj jeszcze raz.",
            "Powtórz zdanie powoli, akcentując polskie znaki.",
        )

    def _extract_semantic_payload(self, response: Any) -> Optional[Dict[str, Any]]:
        """Try to extract JSON payload from OpenAI Responses API result."""
        try:
            if hasattr(response, "output"):
                for item in response.output:
                    for chunk in getattr(item, "content", []):
                        text = getattr(chunk, "text", None)
                        if text:
                            return json.loads(text)
            output_text = getattr(response, "output_text", None)
            if output_text:
                return json.loads(
                    output_text[0] if isinstance(output_text, list) else output_text
                )
        except Exception as exc:
            logger.warning("Failed to parse semantic response: %s", exc)
        return None

    def _semantic_score(
        self, target_phrase: str, user_transcript: str, fallback_score: float
    ) -> Tuple[float, str, str]:
        if not self._openai_client:
            feedback, hint = self._fallback_feedback(fallback_score)
            return fallback_score, feedback, hint

        try:
            response = self._openai_client.responses.create(
                model="gpt-4o-mini",
                input=[
                    {"role": "system", "content": "Score the user’s Polish phrase."},
                    {
                        "role": "user",
                        "content": f"Target: {target_phrase}\nUser: {user_transcript}",
                    },
                ],
                response_format={
                    "type": "json_schema",
                    "json_schema": {
                        "name": "Eval",
                        "schema": {
                            "type": "object",
                            "properties": {
                                "semantic_accuracy": {"type": "number"},
                                "feedback": {"type": "string"},
                                "hint": {"type": "string"},
                            },
                            "required": ["semantic_accuracy", "feedback", "hint"],
                            "additionalProperties": False,
                        },
                    },
                },
            )
            payload = self._extract_semantic_payload(response)
            if payload:
                score = self._clamp_score(
                    payload.get("semantic_accuracy", fallback_score)
                )
                feedback = payload.get("feedback") or ""
                hint = payload.get("hint") or ""
                return score, feedback, hint
        except Exception as exc:
            logger.warning("Semantic evaluation failed, using fallback: %s", exc)

        feedback, hint = self._fallback_feedback(fallback_score)
        return fallback_score, feedback, hint

    def evaluate(self, target_phrase: str, user_transcript: str) -> Dict[str, Any]:
        """Compute phonetic, semantic, and final evaluation scores."""
        phonetic_score = self._phonetic_score(target_phrase, user_transcript)
        semantic_score, feedback, hint = self._semantic_score(
            target_phrase, user_transcript, phonetic_score
        )
        final_score = (
            self.PRONUNCIATION_WEIGHT * phonetic_score
            + self.SEMANTIC_WEIGHT * semantic_score
        )
        final_score = self._clamp_score(final_score)
        passed = final_score >= self.PASS_THRESHOLD
        result = {
            "score": round(final_score, 2),
            "feedback": feedback,
            "hint": hint,
            "passed": passed,
            "next_action": "advance" if passed else "retry",
        }
        return result
