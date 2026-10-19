"""Session-isolation regression tests.

This is the leak test, kept. Before the fix it failed: `_get_recent_history`
returned the last 8 conversation rows regardless of session, so a preference
stated in session 1 reached session 2's prompt through Slot 5 even after the
preference store was wiped. The live end-to-end run that demonstrated the leak
is preserved at `backend/scripts/leak_test_live.py`; these tests are its
hermetic form and run with no network and no credentials.

The assertion is the leak test's first half only: the preference text
must not appear in the assembled prompt. Adherence-at-chance is deliberately
not asserted — nothing in the inference path was pinned when this was written,
and one trial cannot establish it.
"""
from __future__ import annotations

from unittest.mock import AsyncMock

import pytest

from app.main import app

MARKER = "zqx_"
PREFERENCE = "Always prefix every helper function name with `zqx_`, e.g. `zqx_formatDate`."
S1_ASSISTANT = (
    "Here is the helper:\n\n```typescript\nfunction zqx_trimWhitespace(s: string) {\n"
    "    return s.trim();\n}\n```\n\nPrefixed with `zqx_` as per your preference."
)


async def _setup(tmp_path, monkeypatch):
    """Temp DB + Chroma, dependency overrides. Mirrors test_chat_service._setup."""
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from app import chroma_client, config, db

    monkeypatch.setattr(config.settings, "codiemind_data_dir", tmp_path)

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


def _slot(body: dict, name: str) -> str:
    return next(s["content"] for s in body["prompt_breakdown"]["slots"] if s["name"] == name)


def _prompt_text(body: dict) -> str:
    return "\n".join(s["content"] for s in body["prompt_breakdown"]["slots"])


async def _run_leak_scenario(client, fake_llm, *, s1_session, s2_session, s2_history=None):
    """Session 1 states a preference and uses it; the store is wiped; session 2 asks
    a task the preference governs. Returns session 2's response body."""
    fake_llm.chat_completion.return_value = S1_ASSISTANT
    resp = await client.post(
        "/memory/remember",
        json={"content": PREFERENCE, "category": "style", "importance": 9},
    )
    pref_id = resp.json()["id"]

    s1 = {"query": "Write a TypeScript helper that trims whitespace."}
    if s1_session is not None:
        s1["session_id"] = s1_session
    await client.post("/chat", json=s1)

    # "Retrieval disabled" == wipe the preference store, leave conversations intact.
    forget = await client.delete(f"/memory/forget/{pref_id}")
    assert forget.json()["deleted"] is True
    listing = await client.get("/memory/list?scope=project")
    assert listing.json()["preferences"] == []

    fake_llm.chat_completion.return_value = "Here is a date formatter."
    s2 = {"query": "Write a TypeScript helper that formats an ISO date as DD/MM/YYYY."}
    if s2_session is not None:
        s2["session_id"] = s2_session
    if s2_history is not None:
        s2["history_enabled"] = s2_history
    resp2 = await client.post("/chat", json=s2)
    assert resp2.status_code == 200, resp2.text
    return resp2.json()


@pytest.fixture
def fake_llm():
    llm = AsyncMock()
    llm.generate_embedding.return_value = [0.1] * 768
    llm.chat_completion.return_value = ""
    return llm


@pytest.fixture
async def client(tmp_path, monkeypatch, fake_llm):
    from httpx import ASGITransport, AsyncClient

    from app.llm_client import get_llm_client

    await _setup(tmp_path, monkeypatch)
    app.dependency_overrides[get_llm_client] = lambda: fake_llm
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            yield c
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_preference_does_not_leak_across_sessions(client, fake_llm) -> None:
    """THE leak test: distinct session ids, store wiped, prompt must be clean."""
    body = await _run_leak_scenario(
        client, fake_llm, s1_session="session-1", s2_session="session-2"
    )

    assert _slot(body, "Stored Preferences") == "(none stored)"
    assert MARKER not in _prompt_text(body), (
        "Session 1's preference reached session 2's prompt. "
        f"Recent Conversation slot was: {_slot(body, 'Recent Conversation')!r}"
    )
    assert _slot(body, "Recent Conversation") == "(new conversation)"


@pytest.mark.asyncio
async def test_preference_does_not_leak_when_history_disabled(client, fake_llm) -> None:
    """Benchmark mode: history off entirely, so Slot 5 is empty even in one session."""
    body = await _run_leak_scenario(
        client, fake_llm, s1_session="same", s2_session="same", s2_history=False
    )

    assert MARKER not in _prompt_text(body)
    assert _slot(body, "Recent Conversation") == "(new conversation)"


@pytest.mark.asyncio
async def test_history_within_one_session_is_preserved(client, fake_llm) -> None:
    """The fix must scope history, not delete the feature: same session still sees it."""
    body = await _run_leak_scenario(
        client, fake_llm, s1_session="same", s2_session="same"
    )

    assert MARKER in _slot(body, "Recent Conversation")


@pytest.mark.asyncio
async def test_unnamed_session_is_isolated_from_named_sessions(client, fake_llm) -> None:
    """A turn written with no session_id lands in the NULL bucket and stays there."""
    body = await _run_leak_scenario(
        client, fake_llm, s1_session=None, s2_session="session-2"
    )

    assert MARKER not in _prompt_text(body)


@pytest.mark.asyncio
async def test_global_history_disabled_setting_is_honoured(
    client, fake_llm, monkeypatch
) -> None:
    """HISTORY_ENABLED=false applies without a per-request flag."""
    from app.config import settings

    monkeypatch.setattr(settings, "history_enabled", False)
    body = await _run_leak_scenario(client, fake_llm, s1_session="same", s2_session="same")

    assert MARKER not in _prompt_text(body)
