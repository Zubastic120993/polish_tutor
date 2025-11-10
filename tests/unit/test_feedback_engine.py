import random

import pytest

from src.services.feedback_engine import FeedbackEngine


@pytest.fixture
def engine():
    return FeedbackEngine(language="pl")


def test_normalize_text_lowercases_and_strips(engine):
    assert engine.normalize_text("  CZEŚĆ  ") == "cześć"
    assert engine.normalize_text("") == ""


def test_calculate_similarity_matches_exact(engine):
    assert engine.calculate_similarity("Cześć", "Cześć") == pytest.approx(1.0)
    assert engine.calculate_similarity("", "Cześć") == 0.0


@pytest.mark.parametrize(
    "length,expected",
    [
        (5, pytest.approx(0.825)),
        (20, pytest.approx(0.75)),
        (600, 0.7),
    ],
)
def test_calculate_threshold_bounds(engine, length, expected):
    assert engine.calculate_threshold(length) == expected


@pytest.mark.parametrize(
    "score,threshold,expected",
    [
        (0.9, 0.8, "high"),
        (0.65, 0.8, "medium"),
        (0.3, 0.8, "low"),
    ],
)
def test_get_feedback_type(engine, score, threshold, expected):
    assert engine.get_feedback_type(score, threshold) == expected


def test_generate_feedback_fallback_to_basic_matching(monkeypatch, engine):
    monkeypatch.setattr(engine, "evaluate_with_ai", lambda *_, **__: (None, None))
    monkeypatch.setattr(
        engine,
        "calculate_combined_similarity",
        lambda *_, **__: 0.2,
    )
    monkeypatch.setattr(random, "choice", lambda seq: seq[0])

    feedback = engine.generate_feedback(
        user_text="cześć",
        expected_phrases=["dzień dobry"],
        grammar="Politeness",
        hint="Spróbuj formalnego powitania.",
        consecutive_lows=2,
    )

    assert feedback["feedback_type"] == "low"
    assert feedback["score"] == pytest.approx(0.2)
    assert feedback["show_answer"] is True
    assert feedback["expected_phrase"] == "dzień dobry"
    assert feedback["hint"] == "Spróbuj formalnego powitania."
    assert "Grammar" in feedback["grammar_explanation"]

