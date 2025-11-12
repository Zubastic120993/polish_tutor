"""Feedback Engine for evaluating user input and generating responses."""

import logging
import os
import re
from typing import Dict, List, Optional, Tuple

import Levenshtein
from openai import OpenAI
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

# Grammar explanations (bilingual for better learning)
GRAMMAR_EXPLANATIONS = {
    "Accusative": "📖 Grammar: Accusative Case\nIn Polish, nouns change endings when used as objects. After verbs like 'poproszę' (I'd like), you use the accusative form.\nExample: kawa → kawę, herbata → herbatę",
    "Politeness": "📖 Grammar: Polite Forms\nPolish has formal and informal ways to speak. Using 'proszę' and polite verb forms shows respect.",
    "Gratitude": "📖 Grammar: Expressing Gratitude\n'Dziękuję' (thank you) is essential in Polish politeness. You can add 'bardzo' (very much) for emphasis.",
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
        self._openai_client = None

        # Track conversation history for conversational mode
        self._conversation_history: Dict[int, List[Dict[str, str]]] = {}

        # Try to initialize OpenAI client
        try:
            api_key = os.getenv("OPENAI_API_KEY")
            if api_key and api_key.strip():
                self._openai_client = OpenAI(api_key=api_key)
                logger.info("✅ OpenAI client initialized for AI evaluation")
            else:
                logger.warning(
                    "OpenAI API key not found - falling back to basic matching"
                )
        except Exception as e:
            logger.warning(f"Failed to initialize OpenAI: {e}")

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

    def evaluate_with_ai(
        self, user_text: str, expected_phrases: List[str], context: str = ""
    ) -> Tuple[float, str]:
        """Use AI to evaluate if user's response is semantically correct.

        Args:
            user_text: User's input text
            expected_phrases: List of acceptable phrases
            context: Additional context (e.g., prompt or situation)

        Returns:
            Tuple of (score 0.0-1.0, explanation)
        """
        if not self._openai_client:
            logger.debug("OpenAI not available, skipping AI evaluation")
            return None, None

        try:
            # Build prompt for AI evaluation
            expected_list = "\n".join([f"- {phrase}" for phrase in expected_phrases])

            prompt = f"""You are a Polish language tutor evaluating a student's response.

Context: {context if context else "General conversation"}

Expected acceptable answers:
{expected_list}

Student's answer: "{user_text}"

Task: Evaluate if the student's answer is semantically correct and appropriate for the context, even if worded differently.

Respond in JSON format:
{{
    "is_correct": true/false,
    "score": 0.0-1.0 (confidence score),
    "explanation": "Brief explanation in English of why it's correct/incorrect"
}}

Consider:
- Synonyms and alternative phrasings are acceptable
- Minor grammar errors are OK if meaning is clear
- Natural variations of the expected phrases should be accepted
- Cultural appropriateness
"""

            response = self._openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful Polish language tutor. Respond only with valid JSON.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
                max_tokens=200,
            )

            result_text = response.choices[0].message.content.strip()

            # Parse JSON response
            import json

            result = json.loads(result_text)

            is_correct = result.get("is_correct", False)
            score = float(result.get("score", 0.0))
            explanation = result.get("explanation", "")

            logger.info(
                f"AI Evaluation - User: '{user_text}' | Correct: {is_correct} | Score: {score}"
            )

            return score, explanation

        except Exception as e:
            logger.error(f"AI evaluation failed: {e}")
            return None, None

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
        suggest_commands: bool = False,
    ) -> Dict:
        """Generate feedback for user input.

        Args:
            user_text: User's input text
            expected_phrases: List of acceptable expected phrases
            grammar: Grammar topic (optional)
            hint: Hint text (optional)
            consecutive_lows: Number of consecutive low scores (for auto-reveal)
            suggest_commands: Whether to suggest available commands (when user seems confused)

        Returns:
            Dictionary with feedback data:
            {
                "score": float,
                "feedback_type": str,
                "reply_text": str,
                "hint": str or None,
                "grammar_explanation": str or None,
                "show_answer": bool,
                "suggest_commands": bool,
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
                "expected_phrase": expected_phrases[0] if expected_phrases else None,
            }

        # TRY AI EVALUATION FIRST (if available)
        ai_score, ai_explanation = self.evaluate_with_ai(
            user_text,
            expected_phrases,
            context=f"Grammar: {grammar}" if grammar else "",
        )

        if ai_score is not None:
            # AI evaluation succeeded - use it!
            logger.info(
                f"✅ Using AI evaluation | Score: {ai_score} | User: '{user_text}'"
            )
            best_score = ai_score
            best_match = expected_phrases[0]

            # AI provides more accurate scoring, use simpler thresholds
            if best_score >= 0.75:
                feedback_type = "high"
            elif best_score >= 0.5:
                feedback_type = "medium"
            else:
                feedback_type = "low"
        else:
            # FALLBACK: Basic text matching
            logger.info(f"⚠️ AI not available, using basic matching for: '{user_text}'")
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
            feedback_type, user_text, best_match, consecutive_lows, suggest_commands
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
        """Generate reply text based on feedback type.

        Args:
            feedback_type: "high", "medium", or "low"
            user_text: User's input
            expected_phrase: Expected phrase
            consecutive_lows: Number of consecutive low scores
            suggest_commands: Whether to suggest available commands

        Returns:
            Reply text message
        """
        import random

        # Get base message
        messages = FEEDBACK_MESSAGES.get(feedback_type, FEEDBACK_MESSAGES["low"])
        base_message = random.choice(messages)

        # Command suggestion text
        command_suggestion = ""
        if suggest_commands:
            command_suggestion = (
                "\n\n💡 Tip: You can use commands like 'restart', 'clear', 'next', 'repeat', or 'help' "
                "to control the lesson. Type 'help' to see all available commands."
            )

        if feedback_type == "high":
            return base_message + command_suggestion

        elif feedback_type == "medium":
            # Add encouragement
            return f"{base_message} Spróbuj jeszcze raz." + command_suggestion

        else:  # low
            if consecutive_lows >= 2:
                # Auto-reveal answer after two consecutive lows
                return (
                    f"{base_message} Poprawna odpowiedź to: '{expected_phrase}'. Spróbuj jeszcze raz!"
                    + command_suggestion
                )
            else:
                # Provide scaffolded hint
                return (
                    f"{base_message} Pomyśl o: '{expected_phrase[:len(expected_phrase)//2]}...'"
                    + command_suggestion
                )

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

    def generate_conversational_response(
        self, user_text: str, user_id: int, lesson_context: Optional[str] = None
    ) -> str:
        """Generate a conversational response like ChatGPT but as a patient Polish tutor.

        This allows free-form conversation about Polish language, grammar, culture, etc.

        Args:
            user_text: User's input text
            user_id: User ID for conversation history tracking
            lesson_context: Optional context about current lesson

        Returns:
            Conversational response from the tutor
        """
        if not self._openai_client:
            return "Przepraszam, funkcja konwersacyjna wymaga połączenia z OpenAI. Spróbuj odpowiedzieć na pytanie z lekcji."

        # Initialize conversation history for this user
        if user_id not in self._conversation_history:
            self._conversation_history[user_id] = []

        # Build system prompt for patient Polish tutor
        system_prompt = """You are a Patient Polish Tutor - a warm, encouraging, and patient language teacher.
        
Your personality:
- Extremely patient and supportive - never criticize, always encourage
- Use simple, clear explanations
- Celebrate small progress and effort
- Use encouraging phrases like "Świetnie!", "Dobrze!", "Prawie!", "Nie przejmuj się!"
- Mix Polish and English naturally - use Polish when appropriate, English for explanations
- Be conversational and friendly, like ChatGPT, but always focused on teaching Polish

Your teaching style:
- Answer questions about Polish grammar, vocabulary, pronunciation, culture
- Provide examples and practice suggestions
- Correct mistakes gently and explain why
- Encourage practice and celebrate progress
- Use simple language appropriate for A0-A1 learners

Respond naturally in a conversational way, mixing Polish and English as appropriate.
Keep responses helpful, encouraging, and focused on Polish language learning."""

        # Add lesson context if available
        if lesson_context:
            system_prompt += f"\n\nCurrent lesson context: {lesson_context}"

        # Build conversation messages
        messages = [{"role": "system", "content": system_prompt}]

        # Add conversation history (last 10 messages)
        history = self._conversation_history[user_id][-10:]
        for msg in history:
            messages.append(msg)

        # Add current user message
        messages.append({"role": "user", "content": user_text})

        try:
            response = self._openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                temperature=0.7,  # More creative/conversational
                max_tokens=500,
            )

            tutor_response = response.choices[0].message.content.strip()

            # Update conversation history
            self._conversation_history[user_id].append(
                {"role": "user", "content": user_text}
            )
            self._conversation_history[user_id].append(
                {"role": "assistant", "content": tutor_response}
            )

            # Keep history manageable (last 20 messages = 10 exchanges)
            if len(self._conversation_history[user_id]) > 20:
                self._conversation_history[user_id] = self._conversation_history[
                    user_id
                ][-20:]

            logger.info(f"✅ Conversational response generated for user {user_id}")
            return tutor_response

        except Exception as e:
            logger.error(f"Conversational response failed: {e}")
            return "Przepraszam, wystąpił błąd. Spróbuj ponownie lub odpowiedz na pytanie z lekcji."

    def clear_conversation_history(self, user_id: int):
        """Clear conversation history for a user.

        Args:
            user_id: User ID
        """
        if user_id in self._conversation_history:
            del self._conversation_history[user_id]
            logger.info(f"Conversation history cleared for user {user_id}")
