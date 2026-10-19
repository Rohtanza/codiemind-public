"""Chat endpoint: the main query pipeline."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.llm_client import LLMClient, get_llm_client
from app.schemas import (
    ChatRequest,
    ChatResponse,
    LLMCallRecord,
    PromptBreakdown,
    SlotBreakdown,
)
from app.services.chat_service import ChatService

router = APIRouter(tags=["chat"])


@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="Send a query through the full chat pipeline",
)
async def chat(
    payload: ChatRequest,
    session: AsyncSession = Depends(get_session),
    llm: LLMClient = Depends(get_llm_client),
) -> ChatResponse:
    """Retrieve preferences + decisions, assemble prompt, call LLM, return response."""
    service = ChatService(llm, session)
    try:
        result = await service.handle_query(
            payload.query,
            payload.file_path,
            session_id=payload.session_id,
            history_enabled=payload.history_enabled,
            static_preferences=payload.static_preferences,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Chat pipeline failed: {exc}",
        ) from exc

    bd = result["prompt_breakdown"]
    return _build_response(result, bd)


@router.post(
    "/chat/middle_baseline",
    response_model=ChatResponse,
    summary="Benchmark-only: preferences placed in slot 4 instead of slot 2",
)
async def chat_middle_baseline(
    payload: ChatRequest,
    session: AsyncSession = Depends(get_session),
    llm: LLMClient = Depends(get_llm_client),
) -> ChatResponse:
    """Baseline endpoint for benchmark: same as /chat but preferences sit in slot 4 (middle)."""
    service = ChatService(llm, session)
    try:
        result = await service.handle_query_with_placement(
            payload.query,
            placement=4,
            file_path=payload.file_path,
            session_id=payload.session_id,
            history_enabled=payload.history_enabled,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Chat pipeline failed: {exc}",
        ) from exc

    bd = result["prompt_breakdown"]
    return _build_response(result, bd)


def _build_response(result: dict, bd: dict) -> ChatResponse:
    return ChatResponse(
        text=result["text"],
        applied_preference_ids=result["applied_preference_ids"],
        applied_decision_ids=result["applied_decision_ids"],
        prompt_breakdown=PromptBreakdown(
            assembled_at=bd["assembled_at"],
            user_query=bd["user_query"],
            prompt_text=bd.get("prompt_text"),
            slots=[SlotBreakdown(**s) for s in bd["slots"]],
            total_tokens=bd["total_tokens"],
            budget=bd["budget"],
        ),
        llm_call=(
            LLMCallRecord(**result["llm_call"]) if result.get("llm_call") else None
        ),
    )
