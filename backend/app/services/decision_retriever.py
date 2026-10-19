"""Retrieve decisions by semantic similarity (no scoring formula)."""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.chroma_client import get_decisions_collection
from app.llm_client import LLMClient
from app.models import Decision

logger = logging.getLogger(__name__)


class DecisionRetriever:
    """Top-K decision retrieval by cosine similarity."""

    def __init__(self, llm: LLMClient, session: AsyncSession) -> None:
        self._llm = llm
        self._session = session

    async def retrieve(self, query: str, top_k: int = 3) -> list[Decision]:
        """Return the top-K most relevant decisions for the query."""
        collection = get_decisions_collection()
        count = collection.count()
        if count == 0:
            return []

        embedding = await self._llm.generate_embedding(query)
        n_results = min(top_k, count)

        results = collection.query(
            query_embeddings=[embedding],
            n_results=n_results,
            include=["metadatas", "documents"],
        )

        if not results["ids"] or not results["ids"][0]:
            return []

        ids = results["ids"][0]
        metadatas = results["metadatas"][0]
        documents = results["documents"][0]

        decisions: list[Decision] = []
        for i, doc_id in enumerate(ids):
            meta = metadatas[i]
            created_str = meta.get("created_at", "")
            if created_str:
                try:
                    created = datetime.fromisoformat(created_str)
                    if created.tzinfo is None:
                        created = created.replace(tzinfo=timezone.utc)
                except (ValueError, TypeError):
                    created = datetime.now(timezone.utc)
            else:
                created = datetime.now(timezone.utc)

            decisions.append(Decision(
                id=doc_id,
                content=documents[i],
                rationale=meta.get("rationale", ""),
                scope_type=meta.get("scope_type", "project"),
                scope_path=meta.get("scope_path", None) or None,
                importance=meta.get("importance", 7),
                created_at=created,
            ))

        if decisions:
            dec_ids = [d.id for d in decisions]
            stmt = (
                update(Decision)
                .where(Decision.id.in_(dec_ids))
                .values(access_count=Decision.access_count + 1)
            )
            await self._session.execute(stmt)
            await self._session.commit()

        return decisions
