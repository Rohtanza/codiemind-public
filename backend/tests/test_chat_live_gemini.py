"""Live Gemini integration test for the chat pipeline."""
from __future__ import annotations

import os

import pytest

from app.main import app


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
async def test_chat_live_gemini(tmp_path, monkeypatch) -> None:
    """Store one preference, run one chat, assert non-empty response."""
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

    try:
        from httpx import ASGITransport, AsyncClient

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            await client.post(
                "/memory/remember",
                json={
                    "content": "Use arrow functions instead of function declarations",
                    "category": "style",
                    "importance": 7,
                },
            )

            resp = await client.post(
                "/chat",
                json={"query": "Write a function to validate email addresses"},
            )
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert len(body["text"]) > 0
    assert "prompt_breakdown" in body
