"""Feedback Engine for evaluating user input and generating responses."""

import logging
import os
import re
import json
import random
from typing import Dict, List, Optional, Tuple, Union

import Levenshtein
from openai import OpenAI
from phonemizer import phonemize
from phonemizer.backend import EspeakBackend

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------
# FEEDBACK MESSAGES
# ---------------------------------------------------------------------
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

# ---------------------------------------------------------------------
# GRAMMAR EXPLANATIONS
# ---------------------------------------------------------------------
GRAMMAR_EXPLANATIONS = {
    "Accusative": "📖 Grammar: Accusative Case\nIn Polish, nouns change endings when used as objects. After verbs like 'poproszę' (I'd like), you use the accusative form.\nExample: kawa → kawę, herbata → herbatę",
    "Politeness": "📖 Grammar: Polite Forms\nPolish has formal and informal ways to speak. Using 'proszę' and polite verb forms shows respect.",
    "Gratitude": "📖 Grammar: Expressing Gratitude\n'Dziękuję' (thank you) is essential in Polish politeness. You can add 'bardzo' (very much) for emphasis.",
}


# ---------------------------------------------------------------------
# MAIN CLASS
# ---------------------------------------------------------------------
class FeedbackEngine:
    """Engine for evaluating user input and generating feedback."""

    def __init__(self, language: str = "pl"):
        self.language = language
        self._phonemizer_backend: Optional[EspeakBackend] = None
        self._openai_client: Optional[OpenAI] = None
        self._conversation_history: Dict[int, List[Dict[str, str]]] = {}

        try:
            api_key = os.getenv("OPENAI_API_KEY")
            if api_key and api_key.strip():
                self._openai_client = OpenAI(api_key=api_key)
                logger.info("✅ OpenAI client initialized for AI evaluation")
            else:
                logger.warning("OpenAI API key not found — using basic matching only")
        except Exception as e:
            logger.warning(f"Failed to initialize OpenAI: {e}")

    # -----------------------------------------------------------------
    # Utility functions
    # -----------------------------------------------------------------
    def _get_phonemizer(self) -> Optional[EspeakBackend]:
        """Get or create phonemizer backend."""
        if self._phonemizer_backend is None:
            try:
                self._phonemizer_backend = EspeakBackend(self.language)
            except Exception as e:
                logger.warning(f"Failed to initialize phonemizer: {e}")
                self._phonemizer_backend = None
        return self._phonemizer_backend

    def normalize_text(self, text: str) -> str:
        """Normalize text for comparison."""
        if not text:
            return ""
        normalized = text.lower().strip()
        normalized = re.sub(r"\s+", " ", normalized)
        return normalized

    # -----------------------------------------------------------------
    # Similarity metrics
    # -----------------------------------------------------------------
    def calculate_similarity(self, user_text: str, expected_text: str) -> float:
        """Calculate simple Levenshtein similarity."""
        user_norm = self.normalize_text(user_text)
        expected_norm = self.normalize_text(expected_text)
        if not user_norm or not expected_norm:
            return 0.0
        if user_norm == expected_norm:
            return 1.0
        max_len = max(len(user_norm), len(expected_norm))
        if max_len == 0:
            return 1.0
        distance = Levenshtein.distance(user_norm, expected_norm)
        return max(0.0, min(1.0, 1.0 - (distance / max_len)))

    def calculate_phoneme_similarity(
        self, user_text: str, expected_text: str
    ) -> Optional[float]:
        """Calculate phoneme-based similarity."""
        backend = self._get_phonemizer()
        if backend is None:
            return None
        try:
            user_norm = self.normalize_text(user_text)
            expected_norm = self.normalize_text(expected_text)
            if not user_norm or not expected_norm:
                return 0.0
            user_ph = phonemize(user_norm, backend=backend, language=self.language, strip=True)
            exp_ph = phonemize(expected_norm, backend=backend, language=self.language, strip=True)
            if not user_ph or not exp_ph:
                return None
            max_len = max(len(user_ph), len(exp_ph))
            if max_len == 0:
                return 1.0
            distance = Levenshtein.distance(user_ph, exp_ph)
            return max(0.0, min(1.0, 1.0 - (distance / max_len)))
        except Exception as e:
            logger.warning(f"Phoneme comparison failed: {e}")
            return None

    # -----------------------------------------------------------------
    # AI-based evaluation
    # -----------------------------------------------------------------
    def evaluate_with_ai(
        self, user_text: str, expected_phrases: List[str], context: str = ""
    ) -> Tuple[Optional[float], Optional[str]]:
        """Use AI to evaluate if user's response is semantically correct."""
        if not self._openai_client:
            return None, None

        try:
            expected_list = "\n".join([f"- {p}" for p in expected_phrases])
            prompt = f"""
You are a Polish language tutor evaluating a student's response.

Context: {context or 'General conversation'}

Expected acceptable answers:
{expected_list}

Student's answer: "{user_text}"

Respond in JSON:
{{
  "is_correct": true/false,
  "score": 0.0–1.0,
  "explanation": "short explanation"
}}
"""
            response = self._openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a helpful Polish tutor. Reply only with valid JSON."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
                max_tokens=200,
            )
            result_text = response.choices[0].message.content.strip()
            result = json.loads(result_text)

            score = float(result.get("score", 0.0))
            explanation = str(result.get("explanation", ""))
            logger.info(f"AI eval: score={score:.2f} | user='{user_text}'")
            return score, explanation
        except Exception as e:
            logger.error(f"AI evaluation failed: {e}")
            return None, None

    # -----------------------------------------------------------------
    # Combined methods
    # -----------------------------------------------------------------
    def calculate_combined_similarity(self, user_text: str, expected_text: str) -> float:
        """Combine text and phoneme similarity."""
        text_sim = self.calculate_similarity(user_text, expected_text)
        phoneme_sim = self.calculate_phoneme_similarity(user_text, expected_text)
        if phoneme_sim is not None:
            return 0.7 * text_sim + 0.3 * phoneme_sim
        return text_sim

    def calculate_threshold(self, phrase_length: int) -> float:
        """Dynamic threshold based on phrase length."""
        threshold = 0.85 - min(0.15, phrase_length / 200)
        return max(0.7, min(0.85, threshold))

    def get_feedback_type(self, score: float, threshold: float) -> str:
        """Determine feedback level."""
        if score >= threshold:
            return "high"
        elif score >= threshold - 0.25:
            return "medium"
        return "low"

    # -----------------------------------------------------------------
    # Feedback generation
    # -----------------------------------------------------------------
    def generate_feedback(
        self,
        user_text: str,
        expected_phrases: List[str],
        grammar: Optional[str] = None,
        hint: Optional[str] = None,
        consecutive_lows: int = 0,
        suggest_commands: bool = False,
    ) -> Dict[str, Union[str, float, bool, None]]:
        """Generate structured feedback response."""
        if not user_text or not expected_phrases:
            return {
                "score": 0.0,
                "feedback_type": "low",
                "reply_text": "Spróbuj wpisać odpowiedź.",
                "hint": hint,
                "grammar_explanation": None,
                "show_answer": False,
                "expected_phrase": expected_phrases[0] if expected_phrases else None,
            }

        ai_score, _ = self.evaluate_with_ai(user_text, expected_phrases, f"Grammar: {grammar}" if grammar else "")
        if ai_score is not None:
            best_score = ai_score
            best_match = expected_phrases[0]
            feedback_type = "high" if best_score >= 0.75 else "medium" if best_score >= 0.5 else "low"
        else:
            best_score = 0.0
            best_match = expected_phrases[0]
            for exp in expected_phrases:
                s = self.calculate_combined_similarity(user_text, exp)
                if s > best_score:
                    best_score, best_match = s, exp
            feedback_type = self.get_feedback_type(best_score, self.calculate_threshold(len(best_match)))

        reply = self._generate_reply_text(feedback_type, user_text, best_match, consecutive_lows, suggest_commands)
        show_answer = consecutive_lows >= 2
        grammar_explanation = GRAMMAR_EXPLANATIONS.get(grammar) if grammar else None

        return {
            "score": best_score,
            "feedback_type": feedback_type,
            "reply_text": reply,
            "hint": hint if feedback_type != "high" else None,
            "grammar_explanation": grammar_explanation,
            "show_answer": show_answer,
            "expected_phrase": best_match if show_answer else None,
            "suggest_commands": suggest_commands,
        }

    def _generate_reply_text(
        self,
        feedback_type: str,
        user_text: str,
        expected_phrase: str,
        consecutive_lows: int,
        suggest_commands: bool = False,
    ) -> str:
        """Generate human-style response message."""
        messages = FEEDBACK_MESSAGES.get(feedback_type, FEEDBACK_MESSAGES["low"])
        base = random.choice(messages)
        cmd_tip = ""
        if suggest_commands:
            cmd_tip = (
                "\n\n💡 Tip: You can use commands like 'restart', 'next', or 'help' to control the lesson."
            )
        if feedback_type == "high":
            return base + cmd_tip
        elif feedback_type == "medium":
            return f"{base} Spróbuj jeszcze raz." + cmd_tip
        else:
            if consecutive_lows >= 2:
                return f"{base} Poprawna odpowiedź to: '{expected_phrase}'. Spróbuj jeszcze raz!" + cmd_tip
            return f"{base} Pomyśl o: '{expected_phrase[:len(expected_phrase)//2]}...'" + cmd_tip

    # -----------------------------------------------------------------
    # Conversation mode
    # -----------------------------------------------------------------
    def generate_conversational_response(
        self, user_text: str, user_id: int, lesson_context: Optional[str] = None
    ) -> str:
        """Generate a conversational tutor-style response."""
        if not self._openai_client:
            return "Przepraszam, funkcja konwersacyjna wymaga połączenia z OpenAI."

        if user_id not in self._conversation_history:
            self._conversation_history[user_id] = []

        system_prompt = (
            "You are a Patient Polish Tutor — warm, kind, encouraging.\n"
            "Always help learners practice simple Polish.\n"
            "Use Polish where possible, English for short clarifications.\n"
            "Celebrate effort, correct gently, stay friendly."
        )
        if lesson_context:
            system_prompt += f"\nLesson context: {lesson_context}"

        messages = [{"role": "system", "content": system_prompt}]
        messages += self._conversation_history[user_id][-10:]
        messages.append({"role": "user", "content": user_text})

        try:
            resp = self._openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                temperature=0.7,
                max_tokens=500,
            )
            answer = resp.choices[0].message.content.strip()
            self._conversation_history[user_id].extend(
                [{"role": "user", "content": user_text}, {"role": "assistant", "content": answer}]
            )
            self._conversation_history[user_id] = self._conversation_history[user_id][-20:]
            return answer
        except Exception as e:
            logger.error(f"Conversational response failed: {e}")
            return "Przepraszam, wystąpił błąd. Spróbuj ponownie."

    def clear_conversation_history(self, user_id: int) -> None:
        """Clear chat history for this user."""
        if user_id in self._conversation_history:
            del self._conversation_history[user_id]
            logger.info(f"Conversation history cleared for user {user_id}")

            