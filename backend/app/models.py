"""SQLAlchemy ORM models."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def _new_uuid() -> str:
    return str(uuid.uuid4())


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _created_at_of_row(context) -> datetime:
    """Insert default for `last_accessed_at`: stating a preference is its first use."""
    return context.get_current_parameters().get("created_at") or _utcnow()


class Preference(Base):
    __tablename__ = "preferences"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(32), nullable=False)
    scope_type: Mapped[str] = mapped_column(String(16), nullable=False, default="project")
    scope_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    importance: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    source: Mapped[str] = mapped_column(String(16), nullable=False, default="explicit")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow
    )
    access_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # Recency input. Set to `created_at` on insert and to the
    # retrieval time whenever the scorer returns the row. Nullable only because
    # rows written before the column existed carry NULL until backfilled
    # (db._add_missing_columns), and the scorer falls back to `created_at` for them.
    last_accessed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=_created_at_of_row
    )


class Decision(Base):
    """An architectural decision stored separately from preferences."""

    __tablename__ = "decisions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    rationale: Mapped[str] = mapped_column(Text, nullable=False)
    scope_type: Mapped[str] = mapped_column(String(16), nullable=False, default="project")
    scope_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    importance: Mapped[int] = mapped_column(Integer, nullable=False, default=7)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow
    )
    access_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class Conversation(Base):
    """A single conversation turn (user or assistant).

    `session_id` scopes a turn to one conversation session. History retrieval is
    filtered on it so that turns from one session never reach another session's
    prompt. Rows written before this column existed carry
    NULL, which forms its own bucket and is isolated from every named session.
    """

    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    session_id: Mapped[str | None] = mapped_column(
        String(64), nullable=True, index=True, default=None
    )
    role: Mapped[str] = mapped_column(String(16), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    file_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow
    )
