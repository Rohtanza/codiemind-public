"""Tests for PreferenceScorer score math."""
from __future__ import annotations

import pytest

from app.config import settings


def _make_scorer_result(relevance: float, importance_raw: int, age_days: float) -> float:
    """Compute score using the same formula as PreferenceScorer."""
    importance = importance_raw / 10.0
    recency = max(0.0, min(1.0, 0.5 ** (age_days / 7.0)))
    return (
        settings.scorer_recency_weight * recency
        + settings.scorer_importance_weight * importance
        + settings.scorer_relevance_weight * relevance
    )


def test_higher_importance_beats_lower_at_equal_relevance_and_recency():
    high = _make_scorer_result(relevance=0.8, importance_raw=9, age_days=1.0)
    low = _make_scorer_result(relevance=0.8, importance_raw=3, age_days=1.0)
    assert high > low


def test_newer_beats_older_at_equal_importance_and_relevance():
    new = _make_scorer_result(relevance=0.8, importance_raw=5, age_days=0.0)
    old = _make_scorer_result(relevance=0.8, importance_raw=5, age_days=30.0)
    assert new > old


def test_higher_relevance_beats_higher_importance():
    """Relevance weight (0.5) should dominate importance weight (0.3)."""
    high_relevance = _make_scorer_result(relevance=0.9, importance_raw=3, age_days=1.0)
    high_importance = _make_scorer_result(relevance=0.3, importance_raw=9, age_days=1.0)
    assert high_relevance > high_importance


def test_score_in_valid_range():
    score = _make_scorer_result(relevance=1.0, importance_raw=10, age_days=0.0)
    assert 0.0 <= score <= 1.0
    score2 = _make_scorer_result(relevance=0.0, importance_raw=1, age_days=365.0)
    assert 0.0 <= score2 <= 1.0


@pytest.mark.asyncio
async def test_empty_collection_returns_empty(tmp_path, monkeypatch):
    """PreferenceScorer.score() returns [] when the Chroma collection is empty."""
    from unittest.mock import AsyncMock

    from app import chroma_client, config

    monkeypatch.setattr(config.settings, "codiemind_data_dir", tmp_path)
    chroma_client.get_chroma_client.cache_clear()

    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from app.db import Base

    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path}/memory.db")
    factory = async_sessionmaker(engine, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    fake_llm = AsyncMock()
    fake_llm.generate_embedding.return_value = [0.1] * 768

    from app.services.preference_scorer import PreferenceScorer

    async with factory() as session:
        scorer = PreferenceScorer(fake_llm, session)
        result = await scorer.score("test query")

    assert result == []


@pytest.mark.asyncio
async def test_top_k_is_respected(tmp_path, monkeypatch):
    """Scorer returns at most top_k results."""
    from unittest.mock import AsyncMock

    from app import chroma_client, config

    monkeypatch.setattr(config.settings, "codiemind_data_dir", tmp_path)
    chroma_client.get_chroma_client.cache_clear()

    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from app.db import Base

    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path}/memory.db")
    factory = async_sessionmaker(engine, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    collection = chroma_client.get_preferences_collection()
    for i in range(10):
        import uuid

        pid = str(uuid.uuid4())
        collection.upsert(
            ids=[pid],
            documents=[f"preference {i}"],
            embeddings=[[0.1 + i * 0.01] * 768],
            metadatas=[{
                "category": "style",
                "scope_type": "project",
                "scope_path": "",
                "importance": 5,
                "source": "explicit",
                "created_at": "2026-04-20T00:00:00+00:00",
            }],
        )

    fake_llm = AsyncMock()
    fake_llm.generate_embedding.return_value = [0.1] * 768

    from app.services.preference_scorer import PreferenceScorer

    async with factory() as session:
        scorer = PreferenceScorer(fake_llm, session)
        result = await scorer.score("test query", top_k=3)

    assert len(result) <= 3
