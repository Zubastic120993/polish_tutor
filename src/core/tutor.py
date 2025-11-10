"""Tutor class for orchestrating conversation flow."""
import logging
import os
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Set
from difflib import SequenceMatcher

import Levenshtein
from openai import OpenAI

from src.core.lesson_manager import LessonManager
from src.models import Attempt
from src.services.database_service import Database
from src.services.feedback_engine import FeedbackEngine
from src.services.lesson_generator import LessonGenerator
from src.services.srs_manager import SRSManager
from src.services.speech_engine import SpeechEngine

logger = logging.getLogger(__name__)


class Tutor:
    """Main tutor class orchestrating conversation flow."""

    def __init__(
        self,
        lesson_manager: Optional[LessonManager] = None,
        feedback_engine: Optional[FeedbackEngine] = None,
        srs_manager: Optional[SRSManager] = None,
        speech_engine: Optional[SpeechEngine] = None,
        database: Optional[Database] = None,
    ):
        """Initialize Tutor.

        Args:
            lesson_manager: LessonManager instance
            feedback_engine: FeedbackEngine instance
            srs_manager: SRSManager instance
            speech_engine: SpeechEngine instance
            database: Database service instance
        """
        self.lesson_manager = lesson_manager or LessonManager()
        self.feedback_engine = feedback_engine or FeedbackEngine()
        self.srs_manager = srs_manager or SRSManager()
        self.speech_engine = speech_engine or SpeechEngine(
            online_mode=True,  # Use online TTS for better quality
            openai_api_key=os.getenv("OPENAI_API_KEY"),
            elevenlabs_api_key=os.getenv("ELEVENLABS_API_KEY"),
        )
        self.database = database or Database()
        self.lesson_generator = LessonGenerator()  # AI-powered lesson generation

        # Initialize OpenAI client for AI intent detection
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key and api_key.strip():
            self._openai_client = OpenAI(api_key=api_key)
            logger.info("✅ Tutor initialized with OpenAI for intent detection")
        else:
            self._openai_client = None
            logger.warning("OpenAI API key not found - AI features limited")

        # Track consecutive low scores per user/phrase for auto-reveal
        self._consecutive_lows: Dict[Tuple[int, str], int] = {}
        
        # Track recent user inputs that might indicate confusion (non-Polish, low scores)
        self._confusion_indicators: Dict[int, List[str]] = {}
        
        # Track if user is in conversational mode (free chat vs lesson practice)
        self._conversation_mode: Dict[int, bool] = {}

        # Cache for lesson catalog metadata
        self._lesson_catalog: List[Dict] = []

    def respond(
        self,
        user_id: int,
        text: str,
        lesson_id: str,
        dialogue_id: str,
        speed: float = 1.0,
        confidence: Optional[int] = None,
    ) -> Dict:
        """Process user input and generate tutor response.

        Args:
            user_id: User ID
            text: User's input text
            lesson_id: Current lesson ID
            dialogue_id: Current dialogue ID
            speed: Audio playback speed (0.75 or 1.0)
            confidence: Confidence slider value (1-5, optional)

        Returns:
            Response dictionary matching API specification
        """
        # Validate input
        if not text or not text.strip():
            return {
                "status": "error",
                "message": "Invalid input: text cannot be empty",
                "data": None,
            }

        # Check if user directly selected a lesson by ID
        direct_lesson_id = self._detect_direct_lesson_request(text)
        if direct_lesson_id:
            logger.info(f"📘 User requested lesson '{direct_lesson_id}' directly")
            return self._handle_direct_lesson_switch(direct_lesson_id)

        # 🤖 AI-POWERED INTENT DETECTION (with local fallback)
        intent = self._detect_intent(user_id, text, lesson_id, dialogue_id)
        logger.info(f"🤖 AI detected intent: {intent['type']} - {intent.get('action', 'N/A')}")
        
        # Route based on AI-detected intent
        if intent['type'] == 'command':
            # User wants to execute a command (restart, next, change topic, etc.)
            return self._execute_ai_detected_command(intent, text, lesson_id, dialogue_id, user_id, speed)
        
        elif intent['type'] == 'question':
            # User has a question about Polish (conversational mode)
            return self._handle_conversational_response(user_id, text, lesson_id)
        
        # Otherwise, it's practice - continue with normal lesson evaluation
        
        # Load lesson and get current dialogue
        try:
            lesson_data = self.lesson_manager.get_lesson(lesson_id)
            if not lesson_data:
                return {
                    "status": "error",
                    "message": f"Lesson not found: {lesson_id}",
                    "data": None,
                }

            dialogue = self._get_dialogue(lesson_data, dialogue_id)
            if not dialogue:
                return {
                    "status": "error",
                    "message": f"Dialogue not found: {dialogue_id}",
                    "data": None,
                }
        except Exception as e:
            logger.error(f"Error loading lesson: {e}")
            return {
                "status": "error",
                "message": f"Error loading lesson: {str(e)}",
                "data": None,
            }

        # Get expected phrases
        expected_phrases = dialogue.get("expected", [])

        # Track consecutive lows for auto-reveal
        consecutive_lows = self._consecutive_lows.get((user_id, dialogue_id), 0)
        
        # Check if user seems confused (multiple low scores, non-Polish input)
        is_confused = self._detect_confusion(user_id, text, expected_phrases, consecutive_lows)

        # Generate feedback
        feedback = self.feedback_engine.generate_feedback(
            user_text=text,
            expected_phrases=expected_phrases,
            grammar=dialogue.get("grammar"),
            hint=dialogue.get("hint"),
            consecutive_lows=consecutive_lows,
            suggest_commands=is_confused,  # Pass confusion flag to suggest commands
        )

        # Update consecutive lows counter
        if feedback["feedback_type"] == "low":
            self._consecutive_lows[(user_id, dialogue_id)] = consecutive_lows + 1
        else:
            # Reset on non-low feedback
            self._consecutive_lows.pop((user_id, dialogue_id), None)

        # Determine next dialogue using branching logic
        next_dialogue_id = self._determine_next_dialogue(
            text, dialogue, lesson_data, feedback["score"]
        )

        # Get audio paths
        audio_paths = self._get_audio_paths(
            dialogue, lesson_id, dialogue_id, next_dialogue_id, speed
        )

        # Log attempt to database
        attempt_id = self._log_attempt(
            user_id=user_id,
            phrase_id=dialogue_id,
            user_text=text,
            score=feedback["score"],
            feedback_type=feedback["feedback_type"],
        )

        # Update SRS memory (convert score to quality 0-5)
        quality = self._score_to_quality(feedback["score"], feedback["feedback_type"])
        try:
            self.srs_manager.create_or_update_srs_memory(
                user_id=user_id,
                phrase_id=dialogue_id,
                quality=quality,
                confidence=confidence,
                database=self.database,
            )
        except Exception as e:
            logger.warning(f"Failed to update SRS memory: {e}")

        # Format response - include the tutor's Polish phrase so user knows what they're learning
        tutor_phrase = dialogue.get("tutor", "")
        
        return {
            "status": "success",
            "message": feedback["reply_text"],
            "data": {
                "reply_text": feedback["reply_text"],
                "score": feedback["score"],
                "feedback_type": feedback["feedback_type"],
                "hint": feedback.get("hint"),
                "grammar_explanation": feedback.get("grammar_explanation"),
                "audio": audio_paths,
                "next_dialogue_id": next_dialogue_id,
                "show_answer": feedback.get("show_answer", False),
                "expected_phrase": feedback.get("expected_phrase"),
                "tutor_phrase": tutor_phrase,  # The Polish phrase being learned
                "dialogue_id": dialogue_id,  # Current dialogue ID
            },
            "metadata": {
                "attempt_id": attempt_id,
                "timestamp": datetime.utcnow().isoformat() + "Z",
            },
        }

    def _detect_intent(
        self, user_id: int, text: str, lesson_id: str, dialogue_id: str
    ) -> Dict:
        """Detect user intent using AI when available, otherwise fall back to heuristics."""
        if self._openai_client:
            intent = self._detect_intent_with_ai(user_id, text, lesson_id, dialogue_id)
            if intent:
                return intent

        fallback_intent = self._detect_intent_offline(text)
        logger.debug("Using offline intent detection: %s", fallback_intent)
        return fallback_intent

    def _detect_intent_with_ai(self, user_id: int, text: str, lesson_id: str, dialogue_id: str) -> Optional[Dict]:
        """Use AI to understand user's intent and generate appropriate response.
        
        This is a TRUE AI ASSISTANT - conversational, intelligent, context-aware.
        
        Args:
            text: User's input text
            lesson_id: Current lesson ID
            dialogue_id: Current dialogue ID
            
        Returns:
            Dict with 'type', optional 'action', and 'ai_response' for conversational replies
        """
        try:
            # Check if OpenAI client is available
            if not self._openai_client:
                return None
            
            # Use OpenAI to understand intent AND generate response
            system_prompt = """You are a Patient Polish Tutor - an AI assistant that helps people learn Polish.

You can do THREE things:
1. CONTROL lessons (restart, next, skip, change topics, create new lessons)
2. ANSWER questions about Polish (grammar, vocabulary, culture, pronunciation)
3. EVALUATE practice responses (when user tries to speak Polish in the lesson)

Current context:
- User is in a lesson practicing Polish dialogues
- User might want to: practice Polish, ask questions, or change the lesson

Analyze the user's input and respond with JSON:

For LESSON CONTROL (restart, next, skip, change topic):
{
  "type": "command",
  "action": "restart/next/skip/repeat/change_topic/help/clear/lesson_info",
  "ai_response": "Your conversational reply (ask for clarification if needed)",
  "needs_info": true/false (if you need more info from user)
}

For QUESTIONS about Polish:
{
  "type": "question",
  "ai_response": "Your helpful answer"
}

For PRACTICE (user speaking Polish):
{
  "type": "practice"
}

IMPORTANT: Be conversational! If user says "offer another topic" but doesn't specify what, ask them:
{
  "type": "command",
  "action": "change_topic",
  "ai_response": "I'd love to create a new lesson for you! What topic interests you? For example: restaurants, shopping, travel, greetings, or something else?",
  "needs_info": true
}

Examples:
- "offer another topic" → Need clarification, ask what topic
- "teach me about restaurants" → Have topic, can generate
- "what does dziękuję mean?" → Answer the question
- "Poproszę kawę" → It's practice"""

            user_prompt = f"User input: '{text}'\n\nAnalyze and respond."
            
            response = self._openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7,  # More conversational
                max_tokens=200,
            )
            
            # Parse AI response
            ai_response = response.choices[0].message.content.strip()
            
            # Extract JSON from potential markdown
            if "```json" in ai_response:
                ai_response = ai_response.split("```json")[1].split("```")[0].strip()
            elif "```" in ai_response:
                ai_response = ai_response.split("```")[1].split("```")[0].strip()
            
            import json
            intent = json.loads(ai_response)
            
            return intent
            
        except Exception as e:
            logger.warning(f"AI intent detection failed: {e}; using fallback heuristics")
            return None

    def _detect_intent_offline(self, text: str) -> Dict:
        """Best-effort heuristic intent detection when AI is unavailable."""
        if not text or not text.strip():
            return {"type": "practice"}

        lowered = text.strip().lower()

        def contains(*keywords: str) -> bool:
            return any(keyword in lowered for keyword in keywords)

        help_message = (
            "I'm your Polish tutor even without the cloud! Try commands like:\n"
            "• 'restart' – start the lesson again\n"
            "• 'next' – move to the next phrase\n"
            "• 'repeat' – hear the tutor prompt again\n"
            "• 'list lessons' or 'change topic' – pick another scenario\n"
            "Or simply ask a question like 'what does dziękuję mean?'."
        )

        command_checks = [
            (("help", "pomoc", "commands", "co mogę", "jak używać"), "help", help_message, False),
            (("restart", "zacznij od początku", "start over", "od nowa"), "restart", None, False),
            (("next", "dalej", "skip", "kolejne", "continue"), "next", None, False),
            (("repeat", "powtórz", "again please", "jeszcze raz"), "repeat", None, False),
            (("clear chat", "wyczyść", "czyść rozmowę"), "clear", None, False),
            (("lesson info", "informacje o lekcji", "which lesson", "jaka lekcja"), "lesson_info", None, False),
        ]

        for keywords, action, ai_response, needs_info in command_checks:
            if contains(*keywords):
                return {
                    "type": "command",
                    "action": action,
                    "ai_response": ai_response,
                    "needs_info": needs_info,
                }

        if contains("change topic", "inny temat", "another topic", "different lesson", "new lesson", "list lessons", "show lessons") or self._is_catalog_request(text):
            return {
                "type": "command",
                "action": "change_topic",
                "ai_response": "Jasne! Powiedz proszę, jaki temat chcesz ćwiczyć (np. restauracja, zakupy, podróże).",
                "needs_info": True,
            }

        # Treat obvious questions about Polish as conversational Q&A
        question_triggers = [
            "what does", "co znaczy", "jak powiedzieć", "how do you say",
            "why", "dlaczego", "kiedy", "when", "?", "explain", "wytłumacz"
        ]
        if any(trigger in lowered for trigger in question_triggers):
            return {"type": "question"}

        return {"type": "practice"}
    
    def _extract_topic_with_ai(self, text: str) -> str:
        """Use AI to extract the topic from user's request.
        
        Args:
            text: User's input text
            
        Returns:
            Extracted topic string
        """
        try:
            # Check if OpenAI client is available
            if not self._openai_client:
                logger.warning("OpenAI client not available for topic extraction")
                return "conversation"
            
            prompt = f"""Extract the topic/subject the user wants to learn about from this text:

"{text}"

Return ONLY the topic (1-3 words), nothing else.

Examples:
- "teach me about restaurants" → "restaurants"
- "let's learn shopping" → "shopping"
- "I want to practice ordering food" → "ordering food"
- "can we do something about travel?" → "travel"

Topic:"""
            
            response = self._openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=20,
            )
            
            topic = response.choices[0].message.content.strip().lower()
            
            # Clean up quotes and extra words
            topic = topic.replace('"', '').replace("'", '').strip()
            
            if not topic or len(topic) < 2:
                topic = "conversation"
            
            logger.info(f"🎯 Extracted topic: '{topic}'")
            return topic
            
        except Exception as e:
            logger.warning(f"Topic extraction failed: {e}, using default")
            return "conversation"
    
    def _execute_ai_detected_command(
        self, intent: Dict, text: str, lesson_id: str, dialogue_id: str, user_id: int, speed: float
    ) -> Dict:
        """Execute command detected by AI - with conversational responses.
        
        Args:
            intent: Intent dict from AI (includes 'action', 'ai_response', 'needs_info')
            text: Original user text
            lesson_id: Current lesson ID
            dialogue_id: Current dialogue ID
            user_id: User ID
            speed: Audio speed
            
        Returns:
            Command response dict
        """
        action = intent.get('action', 'unknown')
        ai_response = intent.get('ai_response', '')
        needs_info = intent.get('needs_info', False)
        
        # If AI needs more information, try to infer if user wants the lesson list
        if needs_info:
            should_show_catalog = intent.get("action") in {"lesson_info", "change_topic"} or self._is_catalog_request(text) or (ai_response and self._is_catalog_request(ai_response))
            if should_show_catalog:
                lesson_message = self._build_lesson_suggestion_message(limit=6)
                if lesson_message:
                    logger.info("📚 Providing lesson catalog for clarification request")
                    return {
                        "status": "success",
                        "message": lesson_message,
                        "data": {
                            "reply_text": lesson_message,
                            "score": 1.0,
                            "feedback_type": "conversation",
                            "command": "chat",
                            "next_dialogue_id": None,
                            "audio": [],
                        },
                        "metadata": {
                            "timestamp": datetime.utcnow().isoformat() + "Z",
                        },
                    }
                logger.warning("Lesson catalog unavailable when clarification requested")
                return {
                    "status": "success",
                    "message": "I can't reach the lesson list right now, but you can still ask for a topic like 'travel' or 'food'.",
                    "data": {
                        "reply_text": "I can't reach the lesson list right now, but you can still ask for a topic like 'travel' or 'food'.",
                        "score": 1.0,
                        "feedback_type": "conversation",
                        "command": "chat",
                        "next_dialogue_id": None,
                        "audio": [],
                    },
                    "metadata": {
                        "timestamp": datetime.utcnow().isoformat() + "Z",
                    },
                }

            logger.info(f"🤖 AI needs more info from user: {ai_response[:50]}...")
            return {
                "status": "success",
                "message": ai_response,
                "data": {
                    "reply_text": ai_response,
                    "score": 1.0,
                    "feedback_type": "conversation",
                    "command": "chat",
                    "next_dialogue_id": None,
                    "audio": [],
                },
                "metadata": {
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                },
            }
        
        # Handle different command actions
        if action == 'change_topic':
            # User wants to change topic/lesson
            wants_catalog = needs_info or self._is_catalog_request(text)
            if wants_catalog:
                lesson_message = self._build_lesson_suggestion_message(limit=6)
                if lesson_message:
                    logger.info("📚 Showing lesson catalog suggestions to user")
                    return {
                        "status": "success",
                        "message": lesson_message,
                        "data": {
                            "reply_text": lesson_message,
                            "score": 1.0,
                            "feedback_type": "conversation",
                            "command": "chat",
                            "next_dialogue_id": None,
                            "audio": [],
                        },
                        "metadata": {
                            "timestamp": datetime.utcnow().isoformat() + "Z",
                        },
                    }

                logger.warning("Lesson catalog unavailable; falling back to clarification prompt")
                fallback_message = ai_response or "What topic would you like to practice?"
                return {
                    "status": "success",
                    "message": fallback_message,
                    "data": {
                        "reply_text": fallback_message,
                        "score": 1.0,
                        "feedback_type": "conversation",
                        "command": "chat",
                        "next_dialogue_id": None,
                        "audio": [],
                    },
                    "metadata": {
                        "timestamp": datetime.utcnow().isoformat() + "Z",
                    },
                }

            if self.lesson_generator.can_generate():
                # Use AI to extract the topic from user's text
                topic = self._extract_topic_with_ai(text)
                
                logger.info(f"🎓 AI understood: User wants to change topic to '{topic}'")
                
                return {
                    "status": "success",
                    "message": f"🎓 Great! Let me create a new lesson about '{topic}'...\n\nThis will take a few seconds. The AI is generating realistic Polish dialogues for you!",
                    "data": {
                        "reply_text": f"🎓 Great! Let me create a new lesson about '{topic}'...\n\nThis will take a few seconds. The AI is generating realistic Polish dialogues for you!",
                        "score": 1.0,
                        "feedback_type": "command",
                        "command": "create_lesson",
                        "lesson_topic": topic,
                        "next_dialogue_id": None,
                        "audio": [],
                    },
                    "metadata": {
                        "timestamp": datetime.utcnow().isoformat() + "Z",
                    },
                }
            else:
                return {
                    "status": "success",
                    "message": "I understand you want to change topics! Unfortunately, AI lesson generation is not available right now. Try typing 'help' to see available commands.",
                    "data": {
                        "reply_text": "I understand you want to change topics! Unfortunately, AI lesson generation is not available right now. Try typing 'help' to see available commands.",
                        "score": 1.0,
                        "feedback_type": "command",
                        "command": "help",
                        "next_dialogue_id": None,
                        "audio": [],
                    },
                    "metadata": {
                        "timestamp": datetime.utcnow().isoformat() + "Z",
                    },
                }
        
        elif action == 'restart':
            return {
                "status": "success",
                "message": "Okay! Let's restart the lesson from the beginning.",
                "data": {
                    "reply_text": "Okay! Let's restart the lesson from the beginning.",
                    "score": 1.0,
                    "feedback_type": "command",
                    "command": "restart_lesson",
                    "next_dialogue_id": None,
                    "audio": [],
                },
                "metadata": {
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                },
            }
        
        elif action == 'next' or action == 'skip':
            # Get next dialogue
            lesson_data = self.lesson_manager.get_lesson(lesson_id)
            if lesson_data:
                dialogues = lesson_data.get("dialogues", [])
                current_index = next((i for i, d in enumerate(dialogues) if d.get("id") == dialogue_id), -1)
                if current_index >= 0 and current_index < len(dialogues) - 1:
                    next_dialogue = dialogues[current_index + 1]
                    next_id = next_dialogue.get("id")
                    return {
                        "status": "success",
                        "message": "Moving to next phrase!",
                        "data": {
                            "reply_text": "Moving to next phrase!",
                            "score": 1.0,
                            "feedback_type": "command",
                            "command": "next",
                            "next_dialogue_id": next_id,
                            "audio": [],
                        },
                        "metadata": {
                            "timestamp": datetime.utcnow().isoformat() + "Z",
                        },
                    }
        
        elif action == 'repeat':
            return {
                "status": "success",
                "message": "Let me repeat that.",
                "data": {
                    "reply_text": "Let me repeat that.",
                    "score": 1.0,
                    "feedback_type": "command",
                    "command": "repeat",
                    "next_dialogue_id": dialogue_id,
                    "audio": [],
                },
                "metadata": {
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                },
            }
        
        elif action == 'clear':
            return {
                "status": "success",
                "message": "Chat cleared! Ready to continue.",
                "data": {
                    "reply_text": "Chat cleared! Ready to continue.",
                    "score": 1.0,
                    "feedback_type": "command",
                    "command": "clear_chat",
                    "next_dialogue_id": None,
                    "audio": [],
                },
                "metadata": {
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                },
            }
        
        elif action == 'help':
            # Use AI response if provided, otherwise use default
            help_text = ai_response if ai_response else (
                "I'm your AI Polish tutor! You can:\n"
                "• Ask me to teach you about any topic (restaurants, travel, shopping, etc.)\n"
                "• Say 'restart', 'next', 'repeat' to control the lesson\n"
                "• Ask questions like 'what does X mean?'\n"
                "• Just respond in Polish to practice!\n\n"
                "I'll understand what you want - just talk to me naturally! 😊"
            )
            return {
                "status": "success",
                "message": help_text,
                "data": {
                    "reply_text": help_text,
                    "score": 1.0,
                    "feedback_type": "command",
                    "command": "help",
                    "next_dialogue_id": None,
                    "audio": [],
                },
                "metadata": {
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                },
            }
        
        elif action == 'lesson_info':
            # Get lesson information
            try:
                lesson_data = self.lesson_manager.get_lesson(lesson_id)
                if lesson_data:
                    title = lesson_data.get("title", "Unknown Lesson")
                    level = lesson_data.get("level", "Unknown")
                    description = lesson_data.get("description", "No description available.")
                    total_dialogues = len(lesson_data.get("dialogues", []))
                    
                    lesson_info = (
                        f"📚 Lesson Information:\n\n"
                        f"Title: {title}\n"
                        f"Level: {level}\n"
                        f"Description: {description}\n"
                        f"Total phrases: {total_dialogues}\n\n"
                        f"You're currently practicing dialogue phrases. "
                        f"Try to respond in Polish based on the tutor's prompts!"
                    )
                    
                    return {
                        "status": "success",
                        "message": lesson_info,
                        "data": {
                            "reply_text": lesson_info,
                            "score": 1.0,
                            "feedback_type": "command",
                            "command": "lesson_info",
                            "next_dialogue_id": None,
                            "audio": [],
                        },
                        "metadata": {
                            "timestamp": datetime.utcnow().isoformat() + "Z",
                        },
                    }
            except Exception as e:
                logger.error(f"Error getting lesson info: {e}")
        
        # Default: acknowledge but don't know what to do
        return {
            "status": "success",
            "message": f"I understand you want to {action}, but I'm not sure how to do that yet. Try 'help' for available commands.",
            "data": {
                "reply_text": f"I understand you want to {action}, but I'm not sure how to do that yet. Try 'help' for available commands.",
                "score": 1.0,
                "feedback_type": "command",
                "command": "unknown",
                "next_dialogue_id": None,
                "audio": [],
            },
            "metadata": {
                "timestamp": datetime.utcnow().isoformat() + "Z",
            },
        }

    def _build_lesson_suggestion_message(self, limit: int = 5) -> Optional[str]:
        """Construct a conversational lesson suggestion string."""
        try:
            entries = self.lesson_manager.load_lesson_catalog()
        except Exception as exc:
            logger.warning(f"Failed to load lesson catalog for suggestions: {exc}")
            return None

        if not entries:
            return None

        top_entries = entries[: max(1, limit)]

        lines = [
            "📚 Here's a quick list of lessons you can jump into right now:",
            "",
        ]

        for entry in top_entries:
            lesson_id = entry.get("id", "lesson")
            title_pl = entry.get("title_pl") or entry.get("title_en") or lesson_id
            title_en = entry.get("title_en")
            part = entry.get("part")
            module = entry.get("module")

            meta_bits = []
            if part:
                meta_bits.append(part)
            if module:
                meta_bits.append(module)

            meta_text = f" — {' • '.join(meta_bits)}" if meta_bits else ""
            subtitle = f" ({title_en})" if title_en and title_en != title_pl else ""

            lines.append(f"• {title_pl}{subtitle} — type `{lesson_id}` to start{meta_text}")

        lines.extend(
            [
                "",
                "Just reply with the lesson ID (for example: `A1_L03`) or say the topic you want, and I'll load it for you."
            ]
        )

        return "\n".join(lines)

    def _detect_direct_lesson_request(self, text: str) -> Optional[str]:
        """Detect if user directly references a lesson ID."""
        if not text:
            return None

        known_ids = self._get_known_lesson_ids()
        if not known_ids:
            return None

        cleaned_tokens = [
            token.strip(".,!?;:\"'()[]{}").strip()
            for token in text.replace("\n", " ").split()
        ]

        for token in cleaned_tokens:
            if not token:
                continue

            # Check raw token
            if token in known_ids:
                return token

            # Uppercase / lowercase variations
            upper_token = token.upper()
            if upper_token in known_ids:
                return upper_token

            lower_token = token.lower()
            if lower_token in known_ids:
                return lower_token

        return None

    def _handle_direct_lesson_switch(self, lesson_id: str) -> Dict:
        """Build response for direct lesson selection."""
        try:
            lesson_data = self.lesson_manager.get_lesson(lesson_id)
            if not lesson_data:
                raise FileNotFoundError(f"Lesson not found: {lesson_id}")

            title = lesson_data.get("title") or lesson_id
            level = lesson_data.get("level")
            metadata_parts = []
            if level:
                metadata_parts.append(f"Level {level}")

            message_lines = [
                f"✅ Great choice! Loading lesson `{lesson_id}`:",
                f"**{title}**" if title else lesson_id,
            ]

            if metadata_parts:
                message_lines.append(" • ".join(metadata_parts))

            message_lines.append("")
            message_lines.append("Give me a second while I queue up the dialogues…")

            message = "\n".join(message_lines)

            return {
                "status": "success",
                "message": message,
                "data": {
                    "reply_text": message,
                    "score": 1.0,
                    "feedback_type": "command",
                    "command": "load_lesson",
                    "lesson_id": lesson_id,
                    "next_dialogue_id": None,
                    "audio": [],
                },
                "metadata": {
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                },
            }

        except FileNotFoundError:
            logger.warning(f"Lesson {lesson_id} not found for direct selection")
            suggestion = self._build_lesson_suggestion_message(limit=6)
            fallback = suggestion or (
                "I couldn't find that lesson. Try typing 'show me lessons' to see what's available."
            )
            return {
                "status": "success",
                "message": fallback,
                "data": {
                    "reply_text": fallback,
                    "score": 1.0,
                    "feedback_type": "conversation",
                    "command": "chat",
                    "next_dialogue_id": None,
                    "audio": [],
                },
                "metadata": {
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                },
            }
        except Exception as exc:
            logger.error(f"Failed to load lesson {lesson_id}: {exc}")
            error_msg = (
                "Something went wrong while loading that lesson. "
                "Please try again or ask me to show the lesson list."
            )
            return {
                "status": "error",
                "message": error_msg,
                "data": None,
            }

    def _get_known_lesson_ids(self) -> Set[str]:
        """Return set of known lesson IDs."""
        lesson_ids: Set[str] = set()

        if not self._lesson_catalog:
            try:
                self._lesson_catalog = self.lesson_manager.load_lesson_catalog()
            except Exception as exc:
                logger.warning(f"Unable to load lesson catalog for ID cache: {exc}")

        for entry in self._lesson_catalog:
            lesson_id = entry.get("id")
            if lesson_id:
                lesson_ids.add(lesson_id)
                lesson_ids.add(lesson_id.lower())
                lesson_ids.add(lesson_id.upper())

        if lesson_ids:
            return lesson_ids

        # Fallback: scan JSON files
        try:
            lessons = self.lesson_manager.load_all_lessons(validate=False)
            for lesson_id in lessons.keys():
                lesson_ids.add(lesson_id)
                lesson_ids.add(lesson_id.lower())
                lesson_ids.add(lesson_id.upper())
        except Exception as exc:
            logger.warning(f"Unable to load lessons for ID cache: {exc}")

        return lesson_ids

    def _is_catalog_request(self, text: str) -> bool:
        """Detect if user explicitly wants to browse lesson catalog."""
        if not text:
            return False

        lowered = text.lower()
        keywords = [
            "list of lessons",
            "specific list of lessons",
            "show me lessons",
            "show lessons",
            "list lessons",
            "list all lessons",
            "available lessons",
            "what lessons are available",
            "lesson list",
            "catalog",
            "kursy",
            "lista lekcji",
            "pokaż lekcje",
        ]

        return any(phrase in lowered for phrase in keywords)

    def _detect_confusion(self, user_id: int, text: str, expected_phrases: List[str], consecutive_lows: int) -> bool:
        """Detect if user seems confused and might need command suggestions.
        
        Indicators of confusion:
        - Multiple consecutive low scores (3+)
        - Input contains mostly English words (not Polish)
        - Input is very short or doesn't match expected patterns
        - Recent inputs suggest user is trying to control the lesson
        
        Args:
            user_id: User ID
            text: User's input text
            expected_phrases: Expected phrases for current dialogue
            consecutive_lows: Number of consecutive low scores
            
        Returns:
            True if user seems confused, False otherwise
        """
        # Track recent inputs for this user
        if user_id not in self._confusion_indicators:
            self._confusion_indicators[user_id] = []
        
        # Add current input to history (keep last 5)
        self._confusion_indicators[user_id].append(text.lower().strip())
        if len(self._confusion_indicators[user_id]) > 5:
            self._confusion_indicators[user_id].pop(0)
        
        # Check multiple indicators
        confusion_score = 0
        
        # Indicator 1: Many consecutive low scores
        if consecutive_lows >= 3:
            confusion_score += 2
        
        # Indicator 2: Input contains English words that look like commands
        english_command_words = ['start', 'restart', 'clear', 'next', 'skip', 'repeat', 'help', 
                                'begin', 'reset', 'stop', 'end', 'quit', 'exit', 'back']
        text_lower = text.lower()
        if any(word in text_lower for word in english_command_words):
            confusion_score += 1
        
        # Indicator 3: Very short input that doesn't match expected phrases
        if len(text.strip()) < 5 and expected_phrases:
            # Check if it's similar to any expected phrase
            normalized_text = self.feedback_engine.normalize_text(text)
            min_similarity = min(
                self.feedback_engine.calculate_similarity(normalized_text, exp) 
                for exp in expected_phrases
            )
            if min_similarity < 0.3:
                confusion_score += 1
        
        # Indicator 4: Recent inputs suggest confusion (multiple non-Polish inputs)
        recent_inputs = self._confusion_indicators[user_id][-3:]  # Last 3 inputs
        non_polish_count = sum(1 for inp in recent_inputs 
                              if any(word in inp for word in english_command_words))
        if non_polish_count >= 2:
            confusion_score += 1
        
        # User is confused if score >= 2
        return confusion_score >= 2
    
    def _is_conversational_query(self, text: str, user_id: int) -> bool:
        """Detect if user wants to have a free conversation (not practicing a specific phrase).
        
        Indicators:
        - Questions about Polish language, grammar, vocabulary
        - General questions not related to current dialogue
        - User explicitly asks to chat or have a conversation
        - User is in conversation mode (from previous interaction)
        
        Args:
            text: User's input text
            user_id: User ID
            
        Returns:
            True if this should be treated as conversational, False otherwise
        """
        text_lower = text.lower().strip()
        
        # Check if user is already in conversation mode
        if self._conversation_mode.get(user_id, False):
            # Stay in conversation mode unless user explicitly wants to practice
            if any(word in text_lower for word in ['practice', 'lesson', 'exercise', 'ćwicz', 'lekcja']):
                self._conversation_mode[user_id] = False
                return False
            return True
        
        # Question patterns that indicate conversational queries
        question_patterns = [
            'what is', 'what are', 'what does', 'what do', 'how do', 'how to', 'how is',
            'why', 'when', 'where', 'can you explain', 'can you tell', 'tell me about',
            'what does mean', 'what means', 'co to znaczy', 'co znaczy', 'jak powiedzieć',
            'jak się mówi', 'what is the difference', 'what\'s the difference',
            'explain', 'help me understand', 'pomóż mi zrozumieć'
        ]
        
        # Check if it's a question
        if any(pattern in text_lower for pattern in question_patterns):
            # Check if it's about Polish language/grammar/culture
            polish_topics = ['polish', 'polski', 'grammar', 'gramatyka', 'vocabulary', 
                           'słownictwo', 'pronunciation', 'wymowa', 'word', 'słowo',
                           'phrase', 'fraza', 'sentence', 'zdanie', 'verb', 'czasownik',
                           'noun', 'rzeczownik', 'adjective', 'przymiotnik', 'culture',
                           'kultura', 'meaning', 'znaczenie', 'translation', 'tłumaczenie']
            
            if any(topic in text_lower for topic in polish_topics):
                self._conversation_mode[user_id] = True
                return True
        
        # Explicit conversation requests (but exclude restart-related "let's" phrases)
        conversation_requests = [
            'let\'s chat', 'can we chat', 'chat with me', 'talk to me', 'rozmawiajmy',
            'porozmawiajmy', 'pogadajmy', 'conversation mode', 'chat mode'
        ]
        
        # Check for conversation requests, but exclude if it's a restart command
        restart_keywords = ['start', 'restart', 'begin', 'from start', 'from the start', 'over']
        if any(req in text_lower for req in conversation_requests):
            # Make sure it's not a restart command in disguise
            if not any(keyword in text_lower for keyword in restart_keywords):
                self._conversation_mode[user_id] = True
                return True
        
        # If text is very long or contains multiple sentences, might be conversational
        if len(text.split('.')) > 2 or len(text.split('?')) > 1:
            # Check if it doesn't look like a practice response
            if not any(word in text_lower for word in ['proszę', 'dziękuję', 'poproszę', 'kawa', 'herbata']):
                # Might be conversational, but be conservative
                pass
        
        return False
    
    def _handle_conversational_response(
        self, user_id: int, text: str, lesson_id: str
    ) -> Dict:
        """Handle conversational mode - free chat about Polish language.
        
        Args:
            user_id: User ID
            text: User's input text
            lesson_id: Current lesson ID (for context)
            
        Returns:
            Response dictionary with conversational reply
        """
        # Get lesson context if available
        lesson_context = None
        try:
            lesson_data = self.lesson_manager.get_lesson(lesson_id)
            if lesson_data:
                lesson_context = f"Lesson: {lesson_data.get('title', lesson_id)}"
        except Exception:
            pass
        
        # Generate conversational response
        conversational_reply = self.feedback_engine.generate_conversational_response(
            user_text=text,
            user_id=user_id,
            lesson_context=lesson_context
        )
        
        logger.info(f"Conversational mode - User {user_id}: '{text[:50]}...'")
        
        return {
            "status": "success",
            "message": conversational_reply,
            "data": {
                "reply_text": conversational_reply,
                "score": 1.0,  # No scoring in conversation mode
                "feedback_type": "conversation",
                "hint": None,
                "grammar_explanation": None,
                "audio": [],
                "next_dialogue_id": None,  # Don't advance lesson in conversation mode
                "show_answer": False,
                "expected_phrase": None,
            },
            "metadata": {
                "timestamp": datetime.utcnow().isoformat() + "Z",
            },
        }
    
    def _get_dialogue(self, lesson_data: Dict, dialogue_id: str) -> Optional[Dict]:
        """Get dialogue from lesson data.

        Args:
            lesson_data: Lesson data dictionary
            dialogue_id: Dialogue ID

        Returns:
            Dialogue dictionary or None if not found
        """
        dialogues = lesson_data.get("dialogues", [])
        for dialogue in dialogues:
            if dialogue.get("id") == dialogue_id:
                return dialogue
        return None

    def _determine_next_dialogue(
        self, user_text: str, dialogue: Dict, lesson_data: Dict, score: float
    ) -> Optional[str]:
        """Determine next dialogue using branching logic.

        Branching order:
        1. Exact string match (normalized)
        2. Fuzzy match (Levenshtein distance ≤ 2)
        3. Default branch

        Args:
            user_text: User's input text
            dialogue: Current dialogue dictionary
            lesson_data: Lesson data dictionary
            score: Feedback score

        Returns:
            Next dialogue ID or None
        """
        options = dialogue.get("options", [])
        if not options:
            # No options, try to find next dialogue in sequence
            dialogues = lesson_data.get("dialogues", [])
            current_idx = None
            for idx, d in enumerate(dialogues):
                if d.get("id") == dialogue.get("id"):
                    current_idx = idx
                    break
            if current_idx is not None and current_idx + 1 < len(dialogues):
                return dialogues[current_idx + 1].get("id")
            return None

        # Normalize user input
        normalized_input = self.feedback_engine.normalize_text(user_text)

        # Try exact match first
        for option in options:
            match_text = option.get("match", "")
            if match_text:
                normalized_match = self.feedback_engine.normalize_text(match_text)
                if normalized_input == normalized_match:
                    return option.get("next")

        # Try fuzzy match (Levenshtein distance ≤ 2)
        for option in options:
            match_text = option.get("match", "")
            if match_text:
                normalized_match = self.feedback_engine.normalize_text(match_text)
                distance = Levenshtein.distance(normalized_input, normalized_match)
                if distance <= 2:
                    return option.get("next")

        # Use default branch
        for option in options:
            if option.get("default", False):
                return option.get("next")

        return None

    def _get_audio_paths(
        self,
        dialogue: Dict,
        lesson_id: str,
        dialogue_id: str,
        next_dialogue_id: Optional[str],
        speed: float,
    ) -> List[str]:
        """Get audio file paths for response.

        Args:
            dialogue: Current dialogue dictionary
            lesson_id: Lesson ID
            dialogue_id: Current dialogue ID
            next_dialogue_id: Next dialogue ID (for tutor response)
            speed: Playback speed

        Returns:
            List of audio file paths (relative URLs)
        """
        audio_paths = []

        # ALWAYS include audio for the current dialogue's tutor text (so user can hear the Polish)
        tutor_text = dialogue.get("tutor", "")
        if tutor_text:
            audio_path, source = self.speech_engine.get_audio_path(
                text=tutor_text,
                lesson_id=lesson_id,
                phrase_id=dialogue_id,
                audio_filename=dialogue.get("audio"),
                speed=speed,
            )
            if audio_path:
                # Convert to relative URL
                rel_path = str(audio_path).replace("\\", "/")
                if rel_path.startswith("./"):
                    rel_path = rel_path[2:]
                audio_paths.append(f"/{rel_path}")
                logger.info(f"✅ Audio found for dialogue {dialogue_id}: {rel_path} (source: {source})")
            else:
                # Audio generation failed - log warning
                # Frontend will generate on-demand when user clicks the audio button
                logger.warning(f"⚠️ No audio available for dialogue {dialogue_id}, text: '{tutor_text[:50]}...' - will generate on-demand")

        # Also include audio for next dialogue if available
        if next_dialogue_id:
            # Get next dialogue data
            lesson_data = self.lesson_manager.get_lesson(lesson_id)
            if lesson_data:
                next_dialogue = self._get_dialogue(lesson_data, next_dialogue_id)
                if next_dialogue:
                    next_tutor_text = next_dialogue.get("tutor", "")
                    if next_tutor_text:
                        audio_path, _ = self.speech_engine.get_audio_path(
                            text=next_tutor_text,
                            lesson_id=lesson_id,
                            phrase_id=next_dialogue_id,
                            audio_filename=next_dialogue.get("audio"),
                            speed=speed,
                        )
                        if audio_path:
                            # Convert to relative URL
                            rel_path = str(audio_path).replace("\\", "/")
                            if rel_path.startswith("./"):
                                rel_path = rel_path[2:]
                            audio_paths.append(f"/{rel_path}")

        return audio_paths

    def _log_attempt(
        self,
        user_id: int,
        phrase_id: str,
        user_text: str,
        score: float,
        feedback_type: str,
    ) -> Optional[int]:
        """Log attempt to database.

        Args:
            user_id: User ID
            phrase_id: Phrase ID
            user_text: User's input text
            score: Similarity score
            feedback_type: Feedback type (high/medium/low)

        Returns:
            Attempt ID or None if logging failed
        """
        try:
            attempt = self.database.create(
                Attempt,
                user_id=user_id,
                phrase_id=phrase_id,
                user_input=user_text,
                score=score,
                feedback_type=feedback_type,
                created_at=datetime.utcnow(),
            )
            return attempt.id
        except Exception as e:
            logger.error(f"Failed to log attempt: {e}")
            return None

    def _score_to_quality(self, score: float, feedback_type: str) -> int:
        """Convert feedback score to SRS quality (0-5).

        Args:
            score: Similarity score (0.0-1.0)
            feedback_type: Feedback type (high/medium/low)

        Returns:
            Quality score (0-5)
        """
        if feedback_type == "high":
            if score >= 0.95:
                return 5  # Perfect
            elif score >= 0.85:
                return 4  # Correct, easy
            else:
                return 3  # Correct, difficult
        elif feedback_type == "medium":
            return 2  # Incorrect, easy recall
        else:  # low
            if score < 0.3:
                return 0  # Complete blackout
            else:
                return 1  # Incorrect, remembered
