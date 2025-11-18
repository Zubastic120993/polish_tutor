"""Phase B: Evaluation stub service."""


class EvaluatorService:
    """
    Stub for pronunciation + semantic evaluation.
    Step 6: Define function signatures only.
    """

    def evaluate(self, phrase_id: str, user_transcript: str, audio_ref: str) -> dict:
        """
        Returns a STUB scoring result.
        Actual scoring pipeline added in Phase B later.
        """
        return {
            "score": 0.5,
            "feedback": "Stub feedback",
            "hint": "Stub hint",
            "passed": False,
            "next_action": "retry",
        }
