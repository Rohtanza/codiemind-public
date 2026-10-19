"""Chat orchestration: retrieve, assemble, call LLM, persist."""
from __future__ import annotations

import logging
import re
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.llm_client import LLMClient
from app.models import Conversation
from app.services import last_prompt_cache
from app.services.context_assembler import assemble
from app.services.decision_retriever import DecisionRetriever
from app.services.preference_scorer import PreferenceScorer

logger = logging.getLogger(__name__)

PREF_ID_PATTERN = re.compile(r"\[pref:([a-f0-9-]{36})\]")
DEC_ID_PATTERN = re.compile(r"\[dec:([a-f0-9-]{36})\]")


class ChatService:
    """Orchestrates the full chat flow."""

    def __init__(self, llm: LLMClient, session: AsyncSession) -> None:
        self._llm = llm
        self._session = session

    async def handle_query(
        self,
        query: str,
        file_path: str | None = None,
        session_id: str | None = None,
        history_enabled: bool | None = None,
        static_preferences: str | None = None,
    ) -> dict:
        """Run the full pipeline and return a ChatResponse-shaped dict."""
        retriever = DecisionRetriever(self._llm, self._session)

        # Arm B delivers the whole rule file; retrieval is bypassed, not merged.
        scored_prefs = []
        if static_preferences is None:
            scorer = PreferenceScorer(self._llm, self._session)
            scored_prefs = await scorer.score(query, top_k=5)
        decisions = await retriever.retrieve(query, top_k=3)

        history_pairs = await self._history_pairs(session_id, history_enabled)

        assembled = assemble(
            user_query=query,
            scored_preferences=scored_prefs,
            decisions=decisions,
            history=history_pairs,
            static_preferences=static_preferences,
        )

        now = datetime.now(timezone.utc)
        breakdown = {
            "assembled_at": now.isoformat(),
            "user_query": query,
            # Stored in full: run provenance requires prompt_assembled
            # verbatim so a run can be re-scored after a verifier is corrected.
            "prompt_text": assembled.text,
            "slots": [
                {"name": s.name, "tokens": s.tokens, "content": s.content}
                for s in assembled.slots
            ],
            "total_tokens": assembled.total_tokens,
            "budget": assembled.budget,
        }
        last_prompt_cache.store(breakdown)

        response_text = await self._llm.chat_completion(assembled.text)
        llm_call = self._call_record()

        applied_pref_ids = PREF_ID_PATTERN.findall(response_text)
        applied_dec_ids = DEC_ID_PATTERN.findall(response_text)

        await self._persist_turn("user", query, file_path, session_id)
        await self._persist_turn("assistant", response_text, file_path, session_id)

        return {
            "text": response_text,
            "applied_preference_ids": applied_pref_ids,
            "applied_decision_ids": applied_dec_ids,
            "prompt_breakdown": breakdown,
            "llm_call": llm_call,
        }

    async def handle_query_with_placement(
        self,
        query: str,
        placement: int,
        file_path: str | None = None,
        session_id: str | None = None,
        history_enabled: bool | None = None,
    ) -> dict:
        """Run the full pipeline with preferences placed in the specified slot."""
        scorer = PreferenceScorer(self._llm, self._session)
        retriever = DecisionRetriever(self._llm, self._session)

        scored_prefs = await scorer.score(query, top_k=5)
        decisions = await retriever.retrieve(query, top_k=3)

        history_pairs = await self._history_pairs(session_id, history_enabled)

        assembled = assemble(
            user_query=query,
            scored_preferences=scored_prefs,
            decisions=decisions,
            history=history_pairs,
            place_preferences_in_slot=placement,
        )

        now = datetime.now(timezone.utc)
        breakdown = {
            "assembled_at": now.isoformat(),
            "user_query": query,
            # Stored in full: run provenance requires prompt_assembled
            # verbatim so a run can be re-scored after a verifier is corrected.
            "prompt_text": assembled.text,
            "slots": [
                {"name": s.name, "tokens": s.tokens, "content": s.content}
                for s in assembled.slots
            ],
            "total_tokens": assembled.total_tokens,
            "budget": assembled.budget,
        }
        last_prompt_cache.store(breakdown)

        response_text = await self._llm.chat_completion(assembled.text)
        llm_call = self._call_record()

        applied_pref_ids = PREF_ID_PATTERN.findall(response_text)
        applied_dec_ids = DEC_ID_PATTERN.findall(response_text)

        await self._persist_turn("user", query, file_path, session_id)
        await self._persist_turn("assistant", response_text, file_path, session_id)

        return {
            "text": response_text,
            "applied_preference_ids": applied_pref_ids,
            "applied_decision_ids": applied_dec_ids,
            "prompt_breakdown": breakdown,
            "llm_call": llm_call,
        }

    def _call_record(self) -> dict | None:
        """The provider call record, when the client emits one.

        Mocked clients hand back a sentinel rather than a dict; drop it instead
        of letting a MagicMock reach the response model.
        """
        record = getattr(self._llm, "last_call_record", None)
        return record if isinstance(record, dict) else None

    async def _history_pairs(
        self, session_id: str | None, history_enabled: bool | None
    ) -> list[tuple[str, str]]:
        """Slot-5 history for this session, or nothing when history is off.

        The per-request flag wins over the global setting; None defers to it.
        """
        enabled = settings.history_enabled if history_enabled is None else history_enabled
        if not enabled:
            return []
        rows = await self._get_recent_history(session_id, limit=settings.history_limit)
        return [(row.role, row.content) for row in rows]

    async def _get_recent_history(
        self, session_id: str | None, limit: int = 8
    ) -> list[Conversation]:
        """Fetch the last `limit` turns *of this session*, ordered by created_at.

        The session filter is the session-isolation fix: without it this
        returned the last `limit` rows in the whole table, so a preference
        stated in one session reached the next session's prompt through Slot 5
        even with the preference store wiped. `session_id is None` matches only
        NULL rows, so the unnamed bucket is isolated too.
        """
        stmt = (
            select(Conversation)
            .where(
                Conversation.session_id.is_(None)
                if session_id is None
                else Conversation.session_id == session_id
            )
            .order_by(Conversation.created_at.desc())
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        rows = list(result.scalars().all())
        rows.reverse()
        return rows

    async def _persist_turn(
        self,
        role: str,
        content: str,
        file_path: str | None,
        session_id: str | None = None,
    ) -> None:
        """Save a conversation turn to the database."""
        turn = Conversation(
            role=role, content=content, file_path=file_path, session_id=session_id
        )
        self._session.add(turn)
        await self._session.commit()
