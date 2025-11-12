import types

import pytest

import src.services.feedback_engine as fb_module
from src.services.feedback_engine import FeedbackEngine


@pytest.fixture()
def feedback_engine(monkeypatch):
    """Feedback engine with deterministic phoneme handling."""
    # Ensure phonemizer backend always "available"
    monkeypatch.setattr(FeedbackEngine, "_get_phonemizer", lambda self: object())

    def fake_phonemize(text: str, **_) -> str:
        return f"phon-{text.lower()}"

    monkeypatch.setattr(fb_module, "phonemize", fake_phonemize)
    return FeedbackEngine(language="pl")


def test_combined_similarity_uses_phoneme_signal(feedback_engine):
    base_score = feedback_engine.calculate_similarity("Dzień dobry", "Dzien dobry")
    combined = feedback_engine.calculate_combined_similarity(
        "Dzień dobry", "Dzien dobre"
    )
    assert combined != base_score  # phoneme weighting applied
    assert 0.0 <= combined <= 1.0


def test_generate_feedback_reveals_answer_and_suggests_commands(monkeypatch):
    monkeypatch.setitem(fb_module.FEEDBACK_MESSAGES, "low", ["Oj!"])
    engine = FeedbackEngine()
    result = engine.generate_feedback(
        user_text="nie wiem",
        expected_phrases=["To jest test"],
        consecutive_lows=3,
        suggest_commands=True,
    )

    assert result["feedback_type"] == "low"
    assert result["show_answer"] is True
    assert result["expected_phrase"] == "To jest test"
    assert "Tip" in result["reply_text"]


def test_generate_feedback_high_score_hides_hint(monkeypatch):
    monkeypatch.setitem(fb_module.FEEDBACK_MESSAGES, "high", ["Brawo!"])
    engine = FeedbackEngine()
    monkeypatch.setattr(
        FeedbackEngine,
        "evaluate_with_ai",
        lambda self, *args, **kwargs: (None, None),
    )
    monkeypatch.setattr(
        FeedbackEngine,
        "calculate_combined_similarity",
        lambda self, user_text, expected: 0.95,
    )
    result = engine.generate_feedback(
        user_text="Świetnie",
        expected_phrases=["Świetnie"],
        hint="Use Świetnie",
        grammar="Politeness",
    )
    assert result["feedback_type"] == "high"
    assert result["hint"] is None
    assert "Polite" in str(result.get("grammar_explanation", ""))


def test_evaluate_against_expected_returns_best_match(feedback_engine):
    score, match = feedback_engine.evaluate_against_expected(
        "Chce kawę", ["Chcę kawę", "Dzień dobry"]
    )
    assert match == "Chcę kawę"
    assert 0.0 <= score <= 1.0
