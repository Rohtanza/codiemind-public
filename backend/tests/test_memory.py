"""Tests for /memory/remember, /memory/decide, /memory/forget, /memory/list."""
from __future__ import annotations

import os
from unittest.mock import AsyncMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.llm_client import get_llm_client
from app.main import app


async def _setup_test_env(tmp_path, monkeypatch):
    """Redirect data dir and DB to a temp location. Returns (new_engine, new_factory)."""
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

    from app.db import get_session

    app.dependency_overrides[get_session] = _override_session
    chroma_client.get_chroma_client.cache_clear()

    from app.db import Base

    async with new_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    return new_engine, new_factory


def _mock_llm():
    """Create and install a mocked LLM client."""
    fake_llm = AsyncMock()
    fake_llm.generate_embedding.return_value = [0.1] * 768
    app.dependency_overrides[get_llm_client] = lambda: fake_llm
    return fake_llm


@pytest.mark.asyncio
async def test_remember_stores_preference_with_mocked_llm(tmp_path, monkeypatch) -> None:
    await _setup_test_env(tmp_path, monkeypatch)
    _mock_llm()

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/memory/remember",
                json={
                    "content": "Use arrow functions instead of function declarations",
                    "category": "style",
                    "scope_type": "project",
                    "importance": 5,
                },
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["content"] == "Use arrow functions instead of function declarations"
    assert body["category"] == "style"
    assert len(body["id"]) == 36


@pytest.mark.asyncio
async def test_decide_stores_decision(tmp_path, monkeypatch) -> None:
    await _setup_test_env(tmp_path, monkeypatch)
    _mock_llm()

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/memory/decide",
                json={
                    "content": "Use Repository pattern",
                    "rationale": "Swap DB later",
                    "scope_type": "project",
                    "importance": 8,
                },
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["content"] == "Use Repository pattern"
    assert body["rationale"] == "Swap DB later"
    assert body["importance"] == 8
    assert len(body["id"]) == 36


@pytest.mark.asyncio
async def test_forget_deletes_preference(tmp_path, monkeypatch) -> None:
    await _setup_test_env(tmp_path, monkeypatch)
    _mock_llm()

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            create_resp = await client.post(
                "/memory/remember",
                json={"content": "test pref", "category": "style"},
            )
            pref_id = create_resp.json()["id"]

            del_resp = await client.delete(f"/memory/forget/{pref_id}")
    finally:
        app.dependency_overrides.clear()

    assert del_resp.status_code == 200
    body = del_resp.json()
    assert body["deleted"] is True
    assert body["kind"] == "preference"


@pytest.mark.asyncio
async def test_forget_nonexistent_returns_none(tmp_path, monkeypatch) -> None:
    await _setup_test_env(tmp_path, monkeypatch)

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.delete("/memory/forget/00000000-0000-0000-0000-000000000000")
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 200
    assert resp.json()["deleted"] is False
    assert resp.json()["kind"] == "none"


@pytest.mark.asyncio
async def test_list_memories(tmp_path, monkeypatch) -> None:
    await _setup_test_env(tmp_path, monkeypatch)
    _mock_llm()

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            await client.post(
                "/memory/remember",
                json={"content": "pref one", "category": "style"},
            )
            await client.post(
                "/memory/decide",
                json={"content": "dec one", "rationale": "reason"},
            )
            resp = await client.get("/memory/list?scope=project")
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 200
    body = resp.json()
    assert len(body["preferences"]) == 1
    assert len(body["decisions"]) == 1


def _has_active_provider_key() -> bool:
    provider = os.getenv("LLM_PROVIDER", "openai")
    if provider == "openai" and os.getenv("OPENAI_API_KEY"):
        return True
    if provider == "gemini" and os.getenv("GEMINI_API_KEY"):
        return True
    if provider == "openai" and os.getenv("GEMINI_API_KEY"):
        return True
    return False


@pytest.mark.asyncio
@pytest.mark.skipif(
    not _has_active_provider_key(),
    reason="No API key set for the active LLM provider; skipping live test.",
)
async def test_remember_live_gemini(tmp_path, monkeypatch) -> None:
    await _setup_test_env(tmp_path, monkeypatch)

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/memory/remember",
                json={
                    "content": "Use try-catch for error handling",
                    "category": "style",
                    "importance": 7,
                },
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 201, response.text
    assert response.json()["content"].startswith("Use try-catch")
