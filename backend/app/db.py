"""Database engine, session factory, and schema bootstrap."""
from __future__ import annotations

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


class Base(DeclarativeBase):
    pass


settings.codiemind_data_dir.mkdir(parents=True, exist_ok=True)

_engine = create_async_engine(
    f"sqlite+aiosqlite:///{settings.sqlite_path}",
    echo=False,
    future=True,
)

_session_factory = async_sessionmaker(
    _engine,
    expire_on_commit=False,
    class_=AsyncSession,
)


async def _add_missing_columns(conn) -> None:
    """Additively bring an existing SQLite file up to the current model.

    There is no migration framework here (`create_all` alone will not alter a
    table that already exists), and the FYP-1 databases predate
    `conversations.session_id` and `preferences.last_accessed_at`. Only ever adds
    nullable columns and fills NULLs in them, so it cannot destroy data; anything
    beyond that needs a real migration tool.
    """
    from sqlalchemy import text

    rows = await conn.execute(text("PRAGMA table_info(conversations)"))
    columns = {r[1] for r in rows}
    if columns and "session_id" not in columns:
        await conn.execute(text("ALTER TABLE conversations ADD COLUMN session_id VARCHAR(64)"))
        await conn.execute(
            text("CREATE INDEX IF NOT EXISTS ix_conversations_session_id "
                 "ON conversations (session_id)")
        )

    rows = await conn.execute(text("PRAGMA table_info(preferences)"))
    columns = {r[1] for r in rows}
    if columns and "last_accessed_at" not in columns:
        await conn.execute(text("ALTER TABLE preferences ADD COLUMN last_accessed_at DATETIME"))
        # No access timestamps were ever recorded, so creation is the only honest
        # value: an old row's recency is unchanged by the migration itself.
        await conn.execute(
            text("UPDATE preferences SET last_accessed_at = created_at "
                 "WHERE last_accessed_at IS NULL")
        )


async def init_db() -> None:
    from app import models  # noqa: F401

    async with _engine.begin() as conn:
        await _add_missing_columns(conn)
        await conn.run_sync(Base.metadata.create_all)


async def get_session() -> AsyncIterator[AsyncSession]:
    async with _session_factory() as session:
        yield session


engine = _engine
session_factory = _session_factory
