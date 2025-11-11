"""Agent Client for external AI service communication."""
import logging
from typing import Dict, Optional, Any
import httpx
import os

logger = logging.getLogger(__name__)


class AgentClient:
    """Client for communicating with external AI agents (Flowise, LangChain, OpenAI)."""

    def __init__(
        self,
        flowise_url: Optional[str] = None,
        flowise_api_key: Optional[str] = None,
        openai_api_key: Optional[str] = None,
        timeout: float = 30.0,
    ):
        """Initialize Agent Client.

        Args:
            flowise_url: Flowise endpoint URL
            flowise_api_key: Flowise API key
            openai_api_key: OpenAI API key
            timeout: Request timeout in seconds
        """
        self.flowise_url = flowise_url or os.getenv("FLOWISE_URL")
        self.flowise_api_key = flowise_api_key or os.getenv("FLOWISE_API_KEY")
        self.openai_api_key = openai_api_key or os.getenv("OPENAI_API_KEY")
        self.timeout = timeout

        # HTTP client for external requests
        self.client = httpx.AsyncClient(timeout=timeout)

    async def detect_intent(
        self,
        user_id: int,
        text: str,
        lesson_id: str,
        dialogue_id: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Detect user intent using AI.

        Args:
            user_id: User ID
            text: User input text
            lesson_id: Current lesson ID
            dialogue_id: Current dialogue ID
            context: Additional context

        Returns:
            Intent detection result
        """
        # TODO: Implement Flowise/LangChain integration
        # For now, return practice intent as fallback

        # Check for obvious command patterns
        text_lower = text.lower().strip()

        # Direct lesson requests
        if any(keyword in text_lower for keyword in ["lesson", "switch to", "go to"]):
            return {
                "type": "command",
                "action": "switch_lesson",
                "confidence": 0.9,
            }

        # Questions about Polish
        if any(keyword in text_lower for keyword in ["what", "how", "why", "explain"]):
            return {
                "type": "question",
                "confidence": 0.8,
            }

        # Default to practice
        return {
            "type": "practice",
            "confidence": 1.0,
        }

    async def generate_conversational_response(
        self,
        user_id: int,
        question: str,
        lesson_context: Optional[Dict[str, Any]] = None
    ) -> str:
        """Generate conversational response to user question.

        Args:
            user_id: User ID
            question: User's question
            lesson_context: Current lesson context

        Returns:
            AI-generated response
        """
        # TODO: Implement conversational AI response
        return "I'm still learning how to answer questions conversationally. For now, let's continue with the lesson practice!"

    async def execute_command(
        self,
        command: str,
        parameters: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Execute an AI-detected command.

        Args:
            command: Command type
            parameters: Command parameters
            context: Execution context

        Returns:
            Command execution result
        """
        # TODO: Implement command execution logic
        return {
            "status": "error",
            "message": f"Command '{command}' not yet implemented",
            "data": None,
        }

    async def close(self):
        """Close HTTP client."""
        await self.client.aclose()

    async def __aenter__(self):
        """Async context manager entry."""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()
