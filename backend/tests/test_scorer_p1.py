"""Regression tests for the two P1 scorer defects.

Written before the fix and shown to fail against it .

1. Relevance was `clamp(1 - distance)` against a collection whose metric was
   Chroma's default `l2`. For unit vectors l2 returns squared distance
   `2 - 2cos`, so relevance was exactly 0 whenever cos < 0.5.
2. Recency was computed from `created_at`, so a preference used constantly
   decayed exactly like one never used again.

Every test here exercises the real scorer against a real Chroma store and a
real SQLite file under tmp_path. Nothing is recomputed in the test itself.
"""
from __future__ import annotations

import math
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock

import chromadb
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

DIM = 8


def _unit_at_cos(cos: float) -> list[float]:
    """A DIM-d unit vector whose cosine with e0 is exactly `cos`."""
    theta = math.acos(cos)
    return [math.cos(theta), math.sin(theta)] + [0.0] * (DIM - 2)


QUERY = [1.0] + [0.0] * (DIM - 1)


async def _store(tmp_path, monkeypatch):
    """Point the app at an empty store under tmp_path; return a session factory."""
    from app import chroma_client, config
    from app.db import Base

    monkeypatch.setattr(config.settings, "codiemind_data_dir", tmp_path)
    chroma_client.get_chroma_client.cache_clear()
    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path}/memory.db")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    return async_sessionmaker(engine, expire_on_commit=False)


def _meta(created_at: datetime) -> dict:
    return {
        "category": "style", "scope_type": "project", "scope_path": "",
        "importance": 5, "source": "explicit", "created_at": created_at.isoformat(),
    }


async def _add(factory, embedding, created_at, **row_fields) -> str:
    """Insert one preference into SQLite and Chroma, as /memory/remember does."""
    from app import chroma_client
    from app.models import Preference

    pid = str(uuid.uuid4())
    async with factory() as session:
        session.add(Preference(id=pid, content=f"pref {pid[:8]}", category="style",
                               created_at=created_at, **row_fields))
        await session.commit()
    chroma_client.upsert_preference(pid, f"pref {pid[:8]}", embedding, _meta(created_at))
    return pid


def _llm():
    llm = AsyncMock()
    llm.generate_embedding.return_value = QUERY
    return llm


# --- defect 1: relevance metric --------------------------------------------

def test_collections_are_created_with_cosine_space(tmp_path, monkeypatch):
    from app import chroma_client, config

    monkeypatch.setattr(config.settings, "codiemind_data_dir", tmp_path)
    chroma_client.get_chroma_client.cache_clear()
    for get in (chroma_client.get_preferences_collection,
                chroma_client.get_decisions_collection):
        assert get().configuration["hnsw"]["space"] == "cosine"


def test_existing_l2_collection_is_refused_not_silently_used(tmp_path, monkeypatch):
    """Chroma keeps an existing collection's metric even when asked for cosine.

    A pre-fix store must therefore be refused, or the fix silently does nothing.
    """
    from app import chroma_client, config

    chroma_dir = tmp_path / "chroma"
    chroma_dir.mkdir()
    chromadb.PersistentClient(path=str(chroma_dir)).get_or_create_collection("preferences")

    monkeypatch.setattr(config.settings, "codiemind_data_dir", tmp_path)
    chroma_client.get_chroma_client.cache_clear()
    with pytest.raises(Exception, match="cosine"):
        chroma_client.get_preferences_collection()


@pytest.mark.asyncio
@pytest.mark.parametrize("cos", [0.3, 0.45, 0.8])
async def test_relevance_equals_cosine_similarity(tmp_path, monkeypatch, cos):
    """cos 0.3 and 0.45 scored exactly 0 before the fix; 0.8 scored 0.6, not 0.8."""
    from app.services.preference_scorer import PreferenceScorer

    factory = await _store(tmp_path, monkeypatch)
    await _add(factory, _unit_at_cos(cos), datetime.now(timezone.utc))
    async with factory() as session:
        [hit] = await PreferenceScorer(_llm(), session).score("q")
    assert hit.relevance == pytest.approx(cos, abs=1e-4)


@pytest.mark.asyncio
async def test_relevance_separates_preferences_below_half(tmp_path, monkeypatch):
    """Below cos 0.5 the old term was 0 for both, so the ranking was a tie."""
    from app.services.preference_scorer import PreferenceScorer

    factory = await _store(tmp_path, monkeypatch)
    now = datetime.now(timezone.utc)
    near = await _add(factory, _unit_at_cos(0.45), now)
    await _add(factory, _unit_at_cos(0.10), now)
    async with factory() as session:
        ranked = await PreferenceScorer(_llm(), session).score("q")
    assert ranked[0].preference.id == near
    assert ranked[0].relevance > ranked[1].relevance > 0.0


# --- defect 2: recency from last access ------------------------------------

@pytest.mark.asyncio
async def test_recency_uses_last_access_not_creation(tmp_path, monkeypatch):
    """Created 70 days ago, used a minute ago: recent. Before the fix ~0.001."""
    from app.services.preference_scorer import PreferenceScorer

    factory = await _store(tmp_path, monkeypatch)
    now = datetime.now(timezone.utc)
    await _add(factory, _unit_at_cos(0.9), now - timedelta(days=70),
               last_accessed_at=now - timedelta(minutes=1))
    async with factory() as session:
        [hit] = await PreferenceScorer(_llm(), session).score("q")
    assert hit.recency > 0.99


@pytest.mark.asyncio
async def test_being_retrieved_makes_a_preference_recent(tmp_path, monkeypatch):
    """Uses only pre-fix APIs, so it fails on the old code by value, not by schema.

    Created 70 days ago and retrieved once: on the next retrieval it has just been
    used. The old scorer read `created_at` and returned 0.5**10 both times.
    """
    from app.services.preference_scorer import PreferenceScorer

    factory = await _store(tmp_path, monkeypatch)
    await _add(factory, _unit_at_cos(0.9), datetime.now(timezone.utc) - timedelta(days=70))
    async with factory() as session:
        [first] = await PreferenceScorer(_llm(), session).score("q")
    async with factory() as session:
        [second] = await PreferenceScorer(_llm(), session).score("q")
    assert first.recency == pytest.approx(0.5 ** 10, rel=1e-3)
    assert second.recency > 0.99


@pytest.mark.asyncio
async def test_unused_old_preference_still_decays(tmp_path, monkeypatch):
    """The fix must not make everything recent: 70 days unused stays near 0."""
    from app.services.preference_scorer import PreferenceScorer

    factory = await _store(tmp_path, monkeypatch)
    old = datetime.now(timezone.utc) - timedelta(days=70)
    await _add(factory, _unit_at_cos(0.9), old, last_accessed_at=old)
    async with factory() as session:
        [hit] = await PreferenceScorer(_llm(), session).score("q")
    assert hit.recency == pytest.approx(0.5 ** 10, rel=1e-3)


@pytest.mark.asyncio
async def test_retrieval_records_last_access(tmp_path, monkeypatch):
    from app.models import Preference
    from app.services.preference_scorer import PreferenceScorer

    factory = await _store(tmp_path, monkeypatch)
    old = datetime.now(timezone.utc) - timedelta(days=30)
    pid = await _add(factory, _unit_at_cos(0.9), old, last_accessed_at=old)
    async with factory() as session:
        await PreferenceScorer(_llm(), session).score("q")
    async with factory() as session:
        row = (await session.execute(select(Preference).where(Preference.id == pid))).scalar_one()
    seen = row.last_accessed_at.replace(tzinfo=row.last_accessed_at.tzinfo or timezone.utc)
    assert datetime.now(timezone.utc) - seen < timedelta(minutes=5)
    assert row.access_count == 1


@pytest.mark.asyncio
async def test_new_preference_starts_with_last_access_set(tmp_path, monkeypatch):
    from app.models import Preference

    factory = await _store(tmp_path, monkeypatch)
    async with factory() as session:
        p = Preference(content="x", category="style")
        session.add(p)
        await session.commit()
        await session.refresh(p)
    assert p.last_accessed_at is not None


# --- migration of a pre-fix store ------------------------------------------

def test_migration_moves_pre_fix_store_to_cosine(tmp_path):
    """Build a store as the pre-fix code left it, migrate it, check nothing was lost."""
    import sqlite3

    from scripts.migrate_store_cosine import migrate

    data = tmp_path / "data"
    (data / "chroma").mkdir(parents=True)
    old = chromadb.PersistentClient(path=str(data / "chroma"))
    col = old.get_or_create_collection("preferences")  # default metric: l2
    col.add(ids=["p1", "p2"], embeddings=[_unit_at_cos(0.3), _unit_at_cos(0.7)],
            documents=["a", "b"], metadatas=[{"importance": 5}, {"importance": 7}])
    old.get_or_create_collection("decisions")
    del old, col

    db = sqlite3.connect(data / "memory.db")
    db.execute("CREATE TABLE preferences (id VARCHAR(36) PRIMARY KEY, content TEXT, "
               "category VARCHAR(32), scope_type VARCHAR(16), scope_path TEXT, "
               "importance INTEGER, source VARCHAR(16), created_at DATETIME, "
               "updated_at DATETIME, access_count INTEGER)")
    db.execute("INSERT INTO preferences VALUES ('p1','a','style','project',NULL,5,"
               "'explicit','2026-05-01 00:00:00','2026-05-01 00:00:00',3)")
    db.commit()
    db.close()

    report = migrate(data, apply=True)

    new = chromadb.PersistentClient(path=str(data / "chroma"))
    pref = new.get_collection("preferences")
    assert pref.configuration["hnsw"]["space"] == "cosine"
    assert new.get_collection("decisions").configuration["hnsw"]["space"] == "cosine"
    got = pref.get(ids=["p1", "p2"], include=["embeddings", "documents", "metadatas"])
    by_id = dict(zip(got["ids"], zip(got["embeddings"], got["documents"])))
    assert list(by_id["p1"][0]) == pytest.approx(_unit_at_cos(0.3))
    assert by_id["p2"][1] == "b"
    dist = pref.query(query_embeddings=[QUERY], n_results=2, include=["distances"])
    assert sorted(dist["distances"][0]) == pytest.approx([0.3, 0.7], abs=1e-4)

    db = sqlite3.connect(data / "memory.db")
    (last,) = db.execute("SELECT last_accessed_at FROM preferences WHERE id='p1'").fetchone()
    db.close()
    assert last == "2026-05-01 00:00:00"
    from pathlib import Path
    assert Path(report["backup"]).is_dir()
    assert (Path(report["backup"]) / "memory.db").is_file()


def test_migration_is_a_dry_run_by_default(tmp_path):
    from scripts.migrate_store_cosine import migrate

    data = tmp_path / "data"
    (data / "chroma").mkdir(parents=True)
    chromadb.PersistentClient(path=str(data / "chroma")).get_or_create_collection("preferences")
    migrate(data)
    space = chromadb.PersistentClient(path=str(data / "chroma")).get_collection(
        "preferences").configuration["hnsw"]["space"]
    assert space == "l2"
