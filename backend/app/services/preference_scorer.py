"""Score and rank preferences by recency, importance, and semantic relevance."""
from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.chroma_client import get_preferences_collection
from app.config import settings
from app.llm_client import LLMClient
from app.models import Preference

logger = logging.getLogger(__name__)


@dataclass
class ScoredPreference:
    """A preference with its computed score components."""

    preference: Preference
    score: float
    relevance: float
    importance: float
    recency: float


class PreferenceScorer:
    """Retrieve and score preferences against a query."""

    def __init__(self, llm: LLMClient, session: AsyncSession) -> None:
        self._llm = llm
        self._session = session

    async def score(
        self,
        query: str,
        scope_type: str = "project",
        top_k: int = 5,
    ) -> list[ScoredPreference]:
        """Return the top-K scored preferences for the given query."""
        collection = get_preferences_collection()
        count = collection.count()
        if count == 0:
            return []

        embedding = await self._llm.generate_embedding(query)
        n_results = min(20, count)

        results = collection.query(
            query_embeddings=[embedding],
            n_results=n_results,
            include=["distances", "metadatas", "documents"],
        )

        if not results["ids"] or not results["ids"][0]:
            return []

        ids = results["ids"][0]
        distances = results["distances"][0]
        metadatas = results["metadatas"][0]
        documents = results["documents"][0]

        now = datetime.now(timezone.utc)
        scored: list[ScoredPreference] = []

        # Last access lives in SQLite, not in Chroma metadata, because it changes
        # on every retrieval and Chroma metadata is written once at @remember.
        rows = await self._session.execute(
            select(Preference.id, Preference.last_accessed_at, Preference.created_at)
            .where(Preference.id.in_(ids))
        )
        last_access = {
            pid: _as_utc(last or created) for pid, last, created in rows.all()
        }

        for i, doc_id in enumerate(ids):
            meta = metadatas[i]
            if meta.get("scope_type", "project") != scope_type:
                continue

            # The collection metric is cosine (chroma_client refuses anything else),
            # so distance = 1 - cos and this is cosine similarity, floored at 0.
            relevance = max(0.0, min(1.0, 1.0 - distances[i]))
            importance_norm = meta.get("importance", 5) / 10.0

            created = _parse_iso(meta.get("created_at", ""), default=now)

            # Recency decays from the last time the preference was used, not from
            # when it was stated (as in Generative Agents). A Chroma
            # entry with no SQLite row has no access record, so it falls back to
            # creation. The 7-day half-life is unchanged from FYP-1: fixed a priori,
            # not tuned.
            last_used = last_access.get(doc_id, created)
            age_days = max(0.0, (now - last_used).total_seconds() / 86400.0)
            recency = max(0.0, min(1.0, 0.5 ** (age_days / 7.0)))

            score = (
                settings.scorer_recency_weight * recency
                + settings.scorer_importance_weight * importance_norm
                + settings.scorer_relevance_weight * relevance
            )

            pref = Preference(
                id=doc_id,
                content=documents[i],
                category=meta.get("category", "other"),
                scope_type=meta.get("scope_type", "project"),
                scope_path=meta.get("scope_path", None) or None,
                importance=meta.get("importance", 5),
                source=meta.get("source", "explicit"),
                created_at=created,
                last_accessed_at=last_used,
            )

            scored.append(ScoredPreference(
                preference=pref,
                score=score,
                relevance=relevance,
                importance=importance_norm,
                recency=recency,
            ))

        scored.sort(key=lambda s: s.score, reverse=True)
        top = scored[:top_k]

        if top:
            top_ids = [s.preference.id for s in top]
            stmt = (
                update(Preference)
                .where(Preference.id.in_(top_ids))
                .values(access_count=Preference.access_count + 1, last_accessed_at=now)
            )
            await self._session.execute(stmt)
            await self._session.commit()

        return top


def _as_utc(value: datetime) -> datetime:
    """SQLite returns naive datetimes; every timestamp here is written in UTC."""
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def _parse_iso(text: str, default: datetime) -> datetime:
    if not text:
        return default
    try:
        return _as_utc(datetime.fromisoformat(text))
    except (ValueError, TypeError):
        return default
