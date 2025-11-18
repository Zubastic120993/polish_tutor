"""Shared SQLAlchemy column type helpers for v2 models."""

from __future__ import annotations

import uuid

from sqlalchemy.types import CHAR, TypeDecorator

try:  # pragma: no cover - optional Postgres-only dependency
    from sqlalchemy.dialects.postgresql import UUID as _PGUUID  # type: ignore
except Exception:  # pragma: no cover - fallback when dialect not available
    _PGUUID = None


if _PGUUID is not None:
    UUID = _PGUUID  # type: ignore
else:

    class _UUIDFallback(TypeDecorator):
        """Fallback UUID type that stores stringified UUIDs."""

        impl = CHAR
        cache_ok = True

        def __init__(self, as_uuid: bool = False, *args, **kwargs) -> None:
            super().__init__(*args, **kwargs)
            self._as_uuid = as_uuid

        def load_dialect_impl(self, dialect):
            return dialect.type_descriptor(CHAR(36))

        def process_bind_param(self, value, dialect):
            if value is None:
                return value
            if isinstance(value, uuid.UUID):
                return str(value)
            return str(uuid.UUID(str(value)))

        def process_result_value(self, value, dialect):
            if value is None or not self._as_uuid:
                return value
            if isinstance(value, uuid.UUID):
                return value
            return uuid.UUID(str(value))

    UUID = _UUIDFallback  # type: ignore[assignment]
