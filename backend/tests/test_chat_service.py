"""Tests for ChatService integration with mocked LLM."""
from __future__ import annotations

import uuid
from unittest.mock import AsyncMock

import pytest

from app.main import app


async def _setup(tmp_path, monkeypatch):
    """Set up temp DB, Chroma, and return (engine, factory)."""
    from app import chroma_client, config, db

    monkeypatch.setattr(config.settings, "codiemind_data_dir", tmp_path)

    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    new_engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path}/memory.db")
    new_factory = async_sessionmaker(new_engine, expire_on_commit=False)
    monkeypatch.setattr(db, "engine", new_engine)
    monkeypatch.setattr(db, "session_factory", new_factory)

    async def _override_session():
        async with new_factory() as s:
            yield s

    from app.db import Base, get_session

    app.dependency_overrides[get_session] = _override_session
    chroma_client.get_chroma_client.cache_clear()

    async with new_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    return new_engine, new_factory


@pytest.mark.asyncio
async def test_chat_full_flow_with_preferences(tmp_path, monkeypatch) -> None:
    """Store preferences, chat, verify prompt includes them and turns are persisted."""
    await _setup(tmp_path, monkeypatch)

    fake_llm = AsyncMock()
    fake_llm.generate_embedding.return_value = [0.1] * 768

    pref_id_1 = str(uuid.uuid4())
    fake_llm.chat_completion.return_value = (
        f"Here is some code. [pref:{pref_id_1}] Applied your preference."
    )

    from app.llm_client import get_llm_client

    app.dependency_overrides[get_llm_client] = lambda: fake_llm

    try:
        from httpx import ASGITransport, AsyncClient

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            await client.post(
                "/memory/remember",
                json={"content": "Use arrow functions", "category": "style", "importance": 7},
            )
            await client.post(
                "/memory/remember",
                json={"content": "Use camelCase", "category": "naming", "importance": 5},
            )
            await client.post(
                "/memory/remember",
                json={"content": "Use Zod for validation", "category": "tool", "importance": 6},
            )

            chat_resp = await client.post(
                "/chat",
                json={"query": "Write a validation function"},
            )

        assert chat_resp.status_code == 200, chat_resp.text
        body = chat_resp.json()
        assert body["text"] is not None
        assert pref_id_1 in body["applied_preference_ids"]
        assert "prompt_breakdown" in body
        assert len(body["prompt_breakdown"]["slots"]) == 6
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_applied_preference_id_extraction(tmp_path, monkeypatch) -> None:
    """Verify regex extraction of cited pref/dec IDs from LLM response."""
    await _setup(tmp_path, monkeypatch)

    pref_id = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
    dec_id = "11111111-2222-3333-4444-555555555555"
    fake_llm = AsyncMock()
    fake_llm.generate_embedding.return_value = [0.1] * 768
    fake_llm.chat_completion.return_value = (
        f"Code using [pref:{pref_id}] and [dec:{dec_id}] patterns."
    )

    from app.llm_client import get_llm_client

    app.dependency_overrides[get_llm_client] = lambda: fake_llm

    try:
        from httpx import ASGITransport, AsyncClient

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post("/chat", json={"query": "test query"})

        body = resp.json()
        assert pref_id in body["applied_preference_ids"]
        assert dec_id in body["applied_decision_ids"]
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_conversation_turns_persisted(tmp_path, monkeypatch) -> None:
    """After a chat, conversation rows exist in the database."""
    _, new_factory = await _setup(tmp_path, monkeypatch)

    fake_llm = AsyncMock()
    fake_llm.generate_embedding.return_value = [0.1] * 768
    fake_llm.chat_completion.return_value = "Response text."

    from app.llm_client import get_llm_client

    app.dependency_overrides[get_llm_client] = lambda: fake_llm

    try:
        from httpx import ASGITransport, AsyncClient

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            await client.post("/chat", json={"query": "hello"})

        from sqlalchemy import select

        from app.models import Conversation

        async with new_factory() as session:
            result = await session.execute(select(Conversation))
            rows = result.scalars().all()

        assert len(rows) == 2
        roles = {r.role for r in rows}
        assert "user" in roles
        assert "assistant" in roles
    finally:
        app.dependency_overrides.clear()
