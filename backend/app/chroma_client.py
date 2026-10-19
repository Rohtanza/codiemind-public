"""ChromaDB persistent client for semantic retrieval."""
from __future__ import annotations

from functools import lru_cache
from typing import Any

import chromadb

from app.config import settings

PREFERENCES_COLLECTION = "preferences"
DECISIONS_COLLECTION = "decisions"

# The scorer reads relevance as `1 - distance`, which is cosine similarity only if
# the collection's metric is cosine. Collections were once created with no metric,
# so Chroma defaulted to `l2`; for unit vectors that returns `2 - 2cos`, and the
# 0.5-weighted relevance term clamped to exactly 0 whenever cos < 0.5
#.
DISTANCE_SPACE = "cosine"
_COLLECTION_CONFIG = {"hnsw": {"space": DISTANCE_SPACE}}


class StoreMetricError(RuntimeError):
    """A collection exists with a distance metric other than cosine."""


@lru_cache(maxsize=1)
def get_chroma_client() -> chromadb.api.ClientAPI:
    """Persistent ChromaDB client rooted at .codiemind/chroma/."""
    settings.chroma_path.mkdir(parents=True, exist_ok=True)
    return chromadb.PersistentClient(path=str(settings.chroma_path))


def collection_space(collection: chromadb.api.models.Collection.Collection) -> str:
    """The distance metric a collection was built with."""
    return (collection.configuration or {}).get("hnsw", {}).get("space", "l2")


def _get_or_create(name: str) -> chromadb.api.models.Collection.Collection:
    """Get or create a cosine collection, refusing one built with another metric.

    Chroma fixes the metric when a collection is created and silently ignores the
    requested one on every later `get_or_create_collection`. A store written before
    the fix therefore stays `l2` however it is opened, so it is refused here rather
    than scored wrongly.
    """
    collection = get_chroma_client().get_or_create_collection(
        name=name, configuration=_COLLECTION_CONFIG
    )
    space = collection_space(collection)
    if space != DISTANCE_SPACE:
        raise StoreMetricError(
            f"Chroma collection '{name}' uses the '{space}' metric; the scorer requires "
            f"'{DISTANCE_SPACE}'. Migrate the store with "
            f"`python -m scripts.migrate_store_cosine --data-dir {settings.codiemind_data_dir} "
            f"--apply` (see MIGRATION_scorer_p1.md)."
        )
    return collection


def get_preferences_collection() -> chromadb.api.models.Collection.Collection:
    """Idempotent accessor for the preferences collection."""
    return _get_or_create(PREFERENCES_COLLECTION)


def get_decisions_collection() -> chromadb.api.models.Collection.Collection:
    """Idempotent accessor for the decisions collection."""
    return _get_or_create(DECISIONS_COLLECTION)


def _safe_metadata(metadata: dict[str, Any]) -> dict[str, Any]:
    """Coerce metadata values to Chroma-compatible primitive types."""
    return {k: v for k, v in metadata.items() if isinstance(v, (str, int, float, bool))}


def upsert_preference(
    preference_id: str,
    content: str,
    embedding: list[float],
    metadata: dict[str, Any],
) -> None:
    """Upsert a preference document + embedding into ChromaDB."""
    collection = get_preferences_collection()
    collection.upsert(
        ids=[preference_id],
        documents=[content],
        embeddings=[embedding],
        metadatas=[_safe_metadata(metadata)],
    )


def upsert_decision(
    decision_id: str,
    content: str,
    embedding: list[float],
    metadata: dict[str, Any],
) -> None:
    """Upsert a decision document + embedding into ChromaDB."""
    collection = get_decisions_collection()
    collection.upsert(
        ids=[decision_id],
        documents=[content],
        embeddings=[embedding],
        metadatas=[_safe_metadata(metadata)],
    )


def delete_from_collection(collection_name: str, doc_id: str) -> bool:
    """Delete a document by ID from the named collection. Returns True if found."""
    client = get_chroma_client()
    try:
        collection = client.get_collection(name=collection_name)
    except Exception:
        return False
    existing = collection.get(ids=[doc_id])
    if existing and existing["ids"]:
        collection.delete(ids=[doc_id])
        return True
    return False
