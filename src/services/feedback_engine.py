"""Feedback Engine for evaluating user input and generating responses."""
import logging
import re
from typing import Dict, List, Optional, Tuple

import Levenshtein
from phonemizer import phonemize
from phonemizer.backend import EspeakBackend

logger = logging.getLogger(__name__)

# Feedback tone library
FEEDBACK_MESSAGES = {
    "high": [
        "Świetnie!",
        "Doskonale!",
        "Bardzo dobrze!",
        "Świetna robota!",
        "Brawo!",
    ],
    "medium": [
        "Prawie dobrze!",
        "Blisko!",
        "Dobry początek!",
        "Spróbuj jeszcze raz.",
        "Prawie trafiłeś!",
    ],
    "low": [
        "Nie przejmuj się, to trudne!",
        "Spróbujmy razem.",
        "To wymaga praktyki.",
        "Nie martw się, pomogę ci.",
    ],
}

# Grammar explanations (can be expanded)
GRAMMAR_EXPLANATIONS = {
    "Accusative": "Używasz biernika (accusative) - formy rzeczownika po czasownikach jak 'poproszę'.",
    "Politeness": "Używasz grzecznych form - ważne w polskim!",
    "Gratitude": "Wyrażasz wdzięczność - 'dziękuję' to podstawa grzeczności.",
}


class FeedbackEngine:
    """Engine for evaluating user input and generating feedback."""

    def __init__(self, language: str = "pl"):
        """Initialize FeedbackEngine.

        Args:
            language: Language code for phonemizer (default: "pl" for Polish)
        """
        self.language = language
        self._phonemizer_backend = None

    def _get_phonemizer(self) -> EspeakBackend:
        """Get or create phonemizer backend.

        Returns:
            EspeakBackend instance
        """
        if self._phonemizer_backend is None:
            try:
                self._phonemizer_backend = EspeakBackend(self.language)
            except Exception as e:
                logger.warning(f"Failed to initialize phonemizer: {e}")
                self._phonemizer_backend = None
        return self._phonemizer_backend

    def normalize_text(self, text: str) -> str:
        """Normalize text for comparison.

        Args:
            text: Input text

        Returns:
            Normalized text (lowercase, trimmed, basic cleanup)
        """
        if not text:
            return ""
        # Convert to lowercase
        normalized = text.lower().strip()
        # Remove extra whitespace
        normalized = re.sub(r"\s+", " ", normalized)
        # Remove punctuation for comparison (optional - can be made configurable)
        # normalized = re.sub(r'[^\w\s]', '', normalized)
        return normalized

    def calculate_similarity(self, user_text: str, expected_text: str) -> float:
        """Calculate similarity score between user input and expected text.

        Args:
            user_text: User's input text
            expected_text: Expected phrase

        Returns:
            Similarity score between 0.0 and 1.0
        """
        user_norm = self.normalize_text(user_text)
        expected_norm = self.normalize_text(expected_text)

        if not user_norm or not expected_norm:
            return 0.0

        if user_norm == expected_norm:
            return 1.0

        # Calculate Levenshtein distance
        max_len = max(len(user_norm), len(expected_norm))
        if max_len == 0:
            return 1.0

        distance = Levenshtein.distance(user_norm, expected_norm)
        similarity = 1.0 - (distance / max_len)

        return max(0.0, min(1.0, similarity))

    def calculate_phoneme_similarity(
        self, user_text: str, expected_text: str
    ) -> Optional[float]:
        """Calculate phoneme-based similarity.

        Args:
            user_text: User's input text
            expected_text: Expected phrase

        Returns:
            Phoneme similarity score between 0.0 and 1.0, or None if phonemizer unavailable
        """
        backend = self._get_phonemizer()
        if backend is None:
            return None

        try:
            user_norm = self.normalize_text(user_text)
            expected_norm = self.normalize_text(expected_text)

            if not user_norm or not expected_norm:
                return 0.0

            # Phonemize both texts
            user_phonemes = phonemize(
                user_norm, backend=backend, language=self.language, strip=True
            )
            expected_phonemes = phonemize(
                expected_norm, backend=backend, language=self.language, strip=True
            )

            if not user_phonemes or not expected_phonemes:
                return None

            # Calculate similarity on phonemes
            max_len = max(len(user_phonemes), len(expected_phonemes))
            if max_len == 0:
                return 1.0

            distance = Levenshtein.distance(user_phonemes, expected_phonemes)
            similarity = 1.0 - (distance / max_len)

            return max(0.0, min(1.0, similarity))

        except Exception as e:
            logger.warning(f"Phoneme comparison failed: {e}")
            return None

    def calculate_combined_similarity(
        self, user_text: str, expected_text: str
    ) -> float:
        """Calculate combined similarity using text and phoneme comparison.

        Args:
            user_text: User's input text
            expected_text: Expected phrase

        Returns:
            Combined similarity score between 0.0 and 1.0
        """
        text_similarity = self.calculate_similarity(user_text, expected_text)
        phoneme_similarity = self.calculate_phoneme_similarity(user_text, expected_text)

        # If phoneme comparison available, use weighted average (70% text, 30% phoneme)
        # Otherwise, use text similarity only
        if phoneme_similarity is not None:
            combined = 0.7 * text_similarity + 0.3 * phoneme_similarity
            return combined

        return text_similarity

    def calculate_threshold(self, phrase_length: int) -> float:
        """Calculate dynamic threshold based on phrase length.

        Formula: 0.85 - min(0.15, phrase_length / 200)

        Args:
            phrase_length: Length of the expected phrase

        Returns:
            Threshold value between 0.7 and 0.85
        """
        threshold = 0.85 - min(0.15, phrase_length / 200)
        return max(0.7, min(0.85, threshold))

    def get_feedback_type(self, score: float, threshold: float) -> str:
        """Determine feedback type based on score and threshold.

        Args:
            score: Similarity score (0.0-1.0)
            threshold: Dynamic threshold

        Returns:
            Feedback type: "high", "medium", or "low"
        """
        if score >= threshold:
            return "high"
        elif score >= threshold - 0.25:
            return "medium"
        else:
            return "low"

    def generate_feedback(
        self,
        user_text: str,
        expected_phrases: List[str],
        grammar: Optional[str] = None,
        hint: Optional[str] = None,
        consecutive_lows: int = 0,
    ) -> Dict:
        """Generate feedback for user input.

        Args:
            user_text: User's input text
            expected_phrases: List of acceptable expected phrases
            grammar: Grammar topic (optional)
            hint: Hint text (optional)
            consecutive_lows: Number of consecutive low scores (for auto-reveal)

        Returns:
            Dictionary with feedback data:
            {
                "score": float,
                "feedback_type": str,
                "reply_text": str,
                "hint": str or None,
                "grammar_explanation": str or None,
                "show_answer": bool,
            }
        """
        if not user_text or not expected_phrases:
            return {
                "score": 0.0,
                "feedback_type": "low",
                "reply_text": "Spróbuj wpisać odpowiedź.",
                "hint": hint,
                "grammar_explanation": None,
                "show_answer": False,
            }

        # Calculate similarity against best matching expected phrase
        best_score = 0.0
        best_match = expected_phrases[0]

        for expected in expected_phrases:
            score = self.calculate_combined_similarity(user_text, expected)
            if score > best_score:
                best_score = score
                best_match = expected

        # Calculate threshold based on phrase length
        phrase_length = len(best_match)
        threshold = self.calculate_threshold(phrase_length)

        # Determine feedback type
        feedback_type = self.get_feedback_type(best_score, threshold)

        # Generate reply text
        reply_text = self._generate_reply_text(
            feedback_type, user_text, best_match, consecutive_lows
        )

        # Determine if answer should be shown (two consecutive lows)
        show_answer = consecutive_lows >= 2

        # Generate grammar explanation if requested
        grammar_explanation = None
        if grammar and grammar in GRAMMAR_EXPLANATIONS:
            grammar_explanation = GRAMMAR_EXPLANATIONS[grammar]

        return {
            "score": best_score,
            "feedback_type": feedback_type,
            "reply_text": reply_text,
            "hint": hint if feedback_type != "high" else None,
            "grammar_explanation": grammar_explanation,
            "show_answer": show_answer,
            "expected_phrase": best_match if show_answer else None,
        }

    def _generate_reply_text(
        self,
        feedback_type: str,
        user_text: str,
        expected_phrase: str,
        consecutive_lows: int,
    ) -> str:
        """Generate reply text based on feedback type.

        Args:
            feedback_type: "high", "medium", or "low"
            user_text: User's input
            expected_phrase: Expected phrase
            consecutive_lows: Number of consecutive low scores

        Returns:
            Reply text message
        """
        import random

        # Get base message
        messages = FEEDBACK_MESSAGES.get(feedback_type, FEEDBACK_MESSAGES["low"])
        base_message = random.choice(messages)

        if feedback_type == "high":
            return base_message

        elif feedback_type == "medium":
            # Add encouragement
            return f"{base_message} Spróbuj jeszcze raz."

        else:  # low
            if consecutive_lows >= 2:
                # Auto-reveal answer after two consecutive lows
                return f"{base_message} Poprawna odpowiedź to: '{expected_phrase}'. Spróbuj jeszcze raz!"
            else:
                # Provide scaffolded hint
                return f"{base_message} Pomyśl o: '{expected_phrase[:len(expected_phrase)//2]}...'"

    def evaluate_against_expected(
        self, user_text: str, expected_phrases: List[str]
    ) -> Tuple[float, str]:
        """Evaluate user input against expected phrases.

        Args:
            user_text: User's input text
            expected_phrases: List of acceptable expected phrases

        Returns:
            Tuple of (score, best_match)
        """
        if not user_text or not expected_phrases:
            return (0.0, expected_phrases[0] if expected_phrases else "")

        best_score = 0.0
        best_match = expected_phrases[0]

        for expected in expected_phrases:
            score = self.calculate_combined_similarity(user_text, expected)
            if score > best_score:
                best_score = score
                best_match = expected

        return (best_score, best_match)

