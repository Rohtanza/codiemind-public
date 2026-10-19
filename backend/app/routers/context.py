"""Context inspection endpoint: /context/last."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.schemas import PromptBreakdown, SlotBreakdown
from app.services import last_prompt_cache

router = APIRouter(tags=["context"])


@router.get(
    "/context/last",
    response_model=PromptBreakdown,
    summary="Get the last assembled prompt breakdown",
)
async def get_last_context() -> PromptBreakdown:
    """Return the slot-by-slot breakdown of the last assembled prompt."""
    cached = last_prompt_cache.get()
    if cached is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No chat has been processed yet.",
        )
    return PromptBreakdown(
        assembled_at=cached["assembled_at"],
        user_query=cached["user_query"],
        prompt_text=cached.get("prompt_text"),
        slots=[SlotBreakdown(**s) for s in cached["slots"]],
        total_tokens=cached["total_tokens"],
        budget=cached["budget"],
    )
