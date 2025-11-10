"""AI-powered dynamic lesson generator."""
import json
import logging
import os
import re
from typing import Dict, List, Optional

from openai import OpenAI

logger = logging.getLogger(__name__)


class LessonGenerator:
    """Generate custom Polish lessons on-demand using AI."""

    def __init__(self):
        """Initialize LessonGenerator with OpenAI client."""
        self._openai_client = None
        
        try:
            api_key = os.getenv("OPENAI_API_KEY")
            if api_key and api_key.strip():
                self._openai_client = OpenAI(api_key=api_key)
                logger.info("✅ LessonGenerator initialized with AI")
            else:
                logger.warning("OpenAI API key not found - dynamic lessons unavailable")
        except Exception as e:
            logger.error(f"Failed to initialize LessonGenerator: {e}")

    def generate_lesson(
        self, 
        topic: str, 
        level: str = "A0", 
        num_dialogues: int = 5,
        user_id: Optional[int] = None
    ) -> Optional[Dict]:
        """Generate a custom lesson based on topic.
        
        Args:
            topic: Lesson topic (e.g., "restaurant ordering", "shopping", "directions")
            level: CEFR level (A0, A1, A2, etc.)
            num_dialogues: Number of dialogue exchanges to generate
            user_id: User ID for personalization (optional)
            
        Returns:
            Lesson dictionary in the same format as JSON lessons
        """
        total_dialogues = max(1, num_dialogues or 1)

        if not self._openai_client:
            logger.info("OpenAI client not available - using offline template lesson")
            return self._generate_template_lesson(topic, level, total_dialogues)
        
        try:
            prompt = self._build_lesson_prompt(topic, level, total_dialogues)
            
            logger.info(f"🎓 Generating lesson: '{topic}' (Level: {level}, Dialogues: {total_dialogues})")
            
            response = self._openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert Polish language teacher creating A0-A1 level lessons."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=2000
            )
            
            lesson_json = response.choices[0].message.content.strip()
            
            # Extract JSON from potential markdown code blocks
            if "```json" in lesson_json:
                lesson_json = lesson_json.split("```json")[1].split("```")[0].strip()
            elif "```" in lesson_json:
                lesson_json = lesson_json.split("```")[1].split("```")[0].strip()
            
            # Parse and validate
            lesson_data = json.loads(lesson_json)
            
            logger.info(f"✅ Generated lesson: {lesson_data.get('title')}")
            
            return lesson_data
            
        except Exception as e:
            logger.error(f"Failed to generate lesson: {e}", exc_info=True)
            logger.info("Falling back to offline template lesson for '%s'", topic)
            return self._generate_template_lesson(topic, level, total_dialogues)

    def _build_lesson_prompt(self, topic: str, level: str, num_dialogues: int) -> str:
        """Build prompt for AI lesson generation."""
        return f"""Create a Polish language lesson for {level} level learners.

Topic: {topic}

Requirements:
1. Create {num_dialogues} realistic dialogue exchanges
2. Each dialogue should teach practical phrases for {topic}
3. Include Polish text, English translation, hints, and grammar notes
4. Use simple vocabulary appropriate for {level} level
5. Make it conversational and practical

Return ONLY valid JSON in this exact format:
{{
  "id": "generated_[topic_slug]",
  "title": "[Descriptive Title]",
  "level": "{level}",
  "cefr_goal": "Can [describe what learner will achieve]",
  "tags": ["tag1", "tag2"],
  "dialogues": [
    {{
      "id": "generated_[topic]_d1",
      "tutor": "[Polish phrase from tutor]",
      "expected": ["[Polish response 1]", "[Polish response 2]"],
      "translation": "[English translation of tutor phrase]",
      "hint": "[Helpful hint in English]",
      "grammar": "[Grammar concept being taught]",
      "options": [
        {{
          "default": true,
          "next": "generated_[topic]_d2",
          "description": "Continue to next phrase"
        }}
      ]
    }}
  ]
}}

Make it engaging, practical, and beginner-friendly!"""

    def can_generate(self) -> bool:
        """Check if lesson generation is available (AI or offline template)."""
        return True

    def _generate_template_lesson(self, topic: str, level: str, num_dialogues: int) -> Dict:
        """Create a simple, local lesson template when AI generation is unavailable."""
        safe_topic = (topic or "conversation").strip() or "conversation"
        topic_title = safe_topic.title()
        topic_simple = safe_topic.lower()
        topic_slug = re.sub(r"[^a-z0-9]+", "_", topic_simple)
        topic_slug = topic_slug.strip("_") or "conversation"

        templates = [
            {
                "tutor": "Cześć! Dzisiaj ćwiczymy temat {topic}. Powiedz 'Cześć' i przedstaw się.",
                "expected": [
                    "Cześć! Mam na imię Kasia.",
                    "Dzień dobry! Nazywam się Jan."
                ],
                "translation": "Hi! Today we're practicing {topic}. Say 'Cześć' and introduce yourself.",
                "hint": "Użyj 'Cześć' lub 'Dzień dobry', a potem dodaj swoje imię.",
                "grammar": "Greetings & introductions",
            },
            {
                "tutor": "Wyobraź sobie sytuację związaną z {topic_simple}. Grzecznie poproś o potrzebną rzecz.",
                "expected": [
                    "Poproszę o pomoc z {topic_simple}.",
                    "Czy możesz mi pomóc przy {topic_simple}?"
                ],
                "translation": "Imagine a situation about {topic_simple}. Politely ask for what you need.",
                "hint": "Użyj zwrotów 'Poproszę...' lub 'Czy możesz...'.",
                "grammar": "Polite requests",
            },
            {
                "tutor": "Podziękuj i powiedz, dlaczego {topic_simple} jest dla Ciebie ważne.",
                "expected": [
                    "Temat {topic_simple} jest dla mnie ważny, dziękuję za pomoc.",
                    "Dziękuję! Chcę ćwiczyć {topic_simple} częściej."
                ],
                "translation": "Say thank you and explain why {topic_simple} matters to you.",
                "hint": "Po 'Dziękuję' dodaj krótkie wyjaśnienie.",
                "grammar": "Expressing gratitude",
            },
        ]

        dialogues: List[Dict] = []
        for idx in range(num_dialogues):
            template = templates[min(idx, len(templates) - 1)]
            dialogue_id = f"offline_{topic_slug}_d{idx + 1:02d}"
            next_id = f"offline_{topic_slug}_d{idx + 2:02d}" if idx + 1 < num_dialogues else None

            dialogue = {
                "id": dialogue_id,
                "tutor": template["tutor"].format(topic=topic_title, topic_simple=topic_simple),
                "expected": [
                    phrase.format(topic=topic_title, topic_simple=topic_simple)
                    for phrase in template["expected"]
                ],
                "translation": template["translation"].format(topic=topic_title, topic_simple=topic_simple),
                "hint": template["hint"],
                "grammar": template["grammar"],
                "options": [],
            }

            if next_id:
                dialogue["options"] = [
                    {
                        "default": True,
                        "next": next_id,
                        "description": "Kontynuuj rozmowę",
                    }
                ]

            dialogues.append(dialogue)

        lesson = {
            "id": f"offline_{topic_slug}",
            "title": f"Starter: {topic_title}",
            "level": level,
            "cefr_goal": f"Can handle simple phrases about {topic_title}.",
            "description": f"Szybkie ćwiczenia offline dotyczące tematu {topic_title}.",
            "tags": [topic_slug, "offline", "fallback"],
            "dialogues": dialogues,
        }

        logger.info("✅ Created offline template lesson '%s' with %d dialogues", lesson["id"], len(dialogues))
        return lesson
