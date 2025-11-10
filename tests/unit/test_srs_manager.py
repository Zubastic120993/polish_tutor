from datetime import datetime, timedelta
from types import SimpleNamespace

import pytest

from src.services.srs_manager import SRSManager, MIN_EFACTOR


@pytest.fixture(autouse=True)
def srs_memory_stub(monkeypatch):
    """Create a mock SRSMemory class that behaves like SQLAlchemy columns."""

    class MockColumn:
        """Mock SQLAlchemy column that supports comparison operations."""
        def __init__(self, name):
            self.name = name

        def __eq__(self, other):
            return f"{self.name} == {other}"

        def __le__(self, other):
            return f"{self.name} <= {other}"

        def __ge__(self, other):
            return f"{self.name} >= {other}"

        def __lt__(self, other):
            return f"{self.name} < {other}"

        def __gt__(self, other):
            return f"{self.name} > {other}"

        def asc(self):
            """Mock ascending order for order_by()."""
            return f"{self.name} ASC"

        def desc(self):
            """Mock descending order for order_by()."""
            return f"{self.name} DESC"

    class Memory(SimpleNamespace):
        """Mock SRSMemory model with column-like attributes."""
        user_id = MockColumn("user_id")
        phrase_id = MockColumn("phrase_id")
        next_review = MockColumn("next_review")
        strength_level = MockColumn("strength_level")
        last_review = MockColumn("last_review")
        efactor = MockColumn("efactor")
        interval_days = MockColumn("interval_days")
        review_count = MockColumn("review_count")

        def __init__(self, **kwargs):
            super().__init__(**kwargs)

    monkeypatch.setattr("src.services.srs_manager.SRSMemory", Memory)
    return Memory


class StubSession:
    def __init__(self, result=None):
        self.result = result or []
        self.added = []
        self.commits = 0
        self.refreshed = []

    def query(self, *_):
        return self

    def filter(self, *_ , **__):
        return self

    def order_by(self, *_ , **__):
        return self

    def all(self):
        return list(self.result)

    def first(self):
        return self.result[0] if self.result else None

    def add(self, obj):
        self.added.append(obj)

    def commit(self):
        self.commits += 1

    def refresh(self, obj):
        self.refreshed.append(obj)


class StubDB:
    def __init__(self, session: StubSession):
        self.session = session

    def get_session(self):
        session = self.session

        class _CM:
            def __enter__(self_inner):
                return session

            def __exit__(self_inner, exc_type, exc, tb):
                return False

        return _CM()


def test_update_efactor_clamps_to_minimum():
    manager = SRSManager()
    assert manager.update_efactor(1.5, 0) == pytest.approx(max(MIN_EFACTOR, 1.5 - 0.8))
    # Invalid quality falls back to 3 (adjustment -0.14)
    assert manager.update_efactor(2.0, 99) == pytest.approx(2.0 - 0.14)


def test_calculate_interval_with_confidence_modifier():
    manager = SRSManager()
    interval = manager.calculate_interval(
        current_interval=5,
        efactor=2.5,
        review_count=2,
        confidence=5,
    )
    # Base interval: int(2.5 * 5) = 12
    # Confidence modifier (5) => 1 + (5 - 3) * 0.2 = 1.4 => int(12 * 1.4) = 16
    assert interval == 16


def test_calculate_interval_first_review_is_one_day():
    manager = SRSManager()
    assert manager.calculate_interval(0, 2.5, review_count=0) == 1


def test_schedule_next_returns_future_date(monkeypatch):
    manager = SRSManager()
    base_time = datetime(2024, 1, 1, 8, 0, 0)

    class FixedDateTime(datetime):
        @classmethod
        def utcnow(cls):
            return base_time

    monkeypatch.setattr("src.services.srs_manager.datetime", FixedDateTime)

    new_efactor, interval, next_review = manager.schedule_next(
        quality=5,
        current_efactor=2.5,
        current_interval=1,
        review_count=1,
    )

    assert new_efactor == pytest.approx(2.6)
    assert interval == 2  # int(2.6 * 1)
    assert next_review == base_time + timedelta(days=interval)


def test_create_or_update_updates_existing_record(monkeypatch):
    existing = SimpleNamespace(
        efactor=2.5,
        interval_days=2,
        review_count=3,
        next_review=None,
        last_review=None,
        strength_level=2,
    )
    session = StubSession(result=[existing])
    db = StubDB(session)
    manager = SRSManager(database=db)

    updated = manager.create_or_update_srs_memory(
        user_id=1,
        phrase_id="demo",
        quality=5,
        confidence=4,
    )

    assert updated.review_count == 4
    assert session.commits == 1
    assert session.refreshed == [existing]


def test_create_or_update_creates_new_memory(monkeypatch):
    session = StubSession(result=[])
    db = StubDB(session)
    manager = SRSManager(database=db)

    created = manager.create_or_update_srs_memory(
        user_id=1,
        phrase_id="demo",
        quality=2,
    )

    assert created in session.added
    assert created.review_count == 1
    assert session.commits == 1

