"""Memory management endpoints: @remember, @decide, @forget, @memories."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.chroma_client import (
    DECISIONS_COLLECTION,
    PREFERENCES_COLLECTION,
    delete_from_collection,
    upsert_decision,
    upsert_preference,
)
from app.db import get_session
from app.llm_client import LLMClient, get_llm_client
from app.models import Decision, Preference
from app.schemas import (
    DecideRequest,
    DecideResponse,
    DecisionItem,
    ForgetResponse,
    ListMemoriesResponse,
    PreferenceCategory,
    PreferenceItem,
    PreferenceScope,
    PreferenceSource,
    RememberRequest,
    RememberResponse,
)

router = APIRouter(prefix="/memory", tags=["memory"])


@router.post(
    "/remember",
    response_model=RememberResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Store a developer preference",
)
async def remember(
    payload: RememberRequest,
    session: AsyncSession = Depends(get_session),
    llm: LLMClient = Depends(get_llm_client),
) -> RememberResponse:
    """Persist a preference and its embedding to SQLite + ChromaDB."""
    try:
        embedding = await llm.generate_embedding(payload.content)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Embedding generation failed: {exc}",
        ) from exc

    preference = Preference(
        content=payload.content,
        category=payload.category.value,
        scope_type=payload.scope_type.value,
        scope_path=payload.scope_path,
        importance=payload.importance,
        source=payload.source.value,
    )
    session.add(preference)
    await session.commit()
    await session.refresh(preference)

    upsert_preference(
        preference_id=preference.id,
        content=preference.content,
        embedding=embedding,
        metadata={
            "category": preference.category,
            "scope_type": preference.scope_type,
            "scope_path": preference.scope_path or "",
            "importance": preference.importance,
            "source": preference.source,
            "created_at": preference.created_at.isoformat(),
        },
    )

    return RememberResponse(
        id=preference.id,
        content=preference.content,
        category=PreferenceCategory(preference.category),
        scope_type=PreferenceScope(preference.scope_type),
        importance=preference.importance,
        created_at=preference.created_at,
    )


@router.post(
    "/decide",
    response_model=DecideResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Store an architectural decision",
)
async def decide(
    payload: DecideRequest,
    session: AsyncSession = Depends(get_session),
    llm: LLMClient = Depends(get_llm_client),
) -> DecideResponse:
    """Persist a decision and its embedding to SQLite + ChromaDB."""
    try:
        embedding = await llm.generate_embedding(payload.content)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Embedding generation failed: {exc}",
        ) from exc

    decision = Decision(
        content=payload.content,
        rationale=payload.rationale,
        scope_type=payload.scope_type.value,
        scope_path=payload.scope_path,
        importance=payload.importance,
    )
    session.add(decision)
    await session.commit()
    await session.refresh(decision)

    upsert_decision(
        decision_id=decision.id,
        content=decision.content,
        embedding=embedding,
        metadata={
            "scope_type": decision.scope_type,
            "scope_path": decision.scope_path or "",
            "importance": decision.importance,
            "rationale": decision.rationale,
            "created_at": decision.created_at.isoformat(),
        },
    )

    return DecideResponse(
        id=decision.id,
        content=decision.content,
        rationale=decision.rationale,
        scope_type=PreferenceScope(decision.scope_type),
        importance=decision.importance,
        created_at=decision.created_at,
    )


@router.delete(
    "/forget/{item_id}",
    response_model=ForgetResponse,
    summary="Delete a preference or decision by ID",
)
async def forget(
    item_id: str,
    session: AsyncSession = Depends(get_session),
) -> ForgetResponse:
    """Delete from SQLite and ChromaDB. Tries preferences first, then decisions."""
    pref = await session.get(Preference, item_id)
    if pref:
        await session.delete(pref)
        await session.commit()
        delete_from_collection(PREFERENCES_COLLECTION, item_id)
        return ForgetResponse(deleted=True, kind="preference")

    dec = await session.get(Decision, item_id)
    if dec:
        await session.delete(dec)
        await session.commit()
        delete_from_collection(DECISIONS_COLLECTION, item_id)
        return ForgetResponse(deleted=True, kind="decision")

    return ForgetResponse(deleted=False, kind="none")


@router.get(
    "/list",
    response_model=ListMemoriesResponse,
    summary="List all stored preferences and decisions",
)
async def list_memories(
    scope: str = "project",
    session: AsyncSession = Depends(get_session),
) -> ListMemoriesResponse:
    """Return all preferences and decisions grouped by scope."""
    pref_result = await session.execute(
        select(Preference).where(Preference.scope_type == scope)
    )
    prefs = pref_result.scalars().all()

    dec_result = await session.execute(
        select(Decision).where(Decision.scope_type == scope)
    )
    decs = dec_result.scalars().all()

    return ListMemoriesResponse(
        preferences=[
            PreferenceItem(
                id=p.id,
                content=p.content,
                category=PreferenceCategory(p.category),
                scope_type=PreferenceScope(p.scope_type),
                importance=p.importance,
                source=PreferenceSource(p.source),
                created_at=p.created_at,
            )
            for p in prefs
        ],
        decisions=[
            DecisionItem(
                id=d.id,
                content=d.content,
                rationale=d.rationale,
                scope_type=PreferenceScope(d.scope_type),
                importance=d.importance,
                created_at=d.created_at,
            )
            for d in decs
        ],
    )
