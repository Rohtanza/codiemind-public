"""In-memory cache for the last assembled prompt breakdown."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

_cache: dict[str, Any] | None = None


def store(breakdown: dict[str, Any]) -> None:
    """Save the last prompt breakdown."""
    global _cache
    _cache = breakdown


def get() -> dict[str, Any] | None:
    """Return the last stored breakdown, or None."""
    return _cache


def clear() -> None:
    """Clear the cache (for tests)."""
    global _cache
    _cache = None
