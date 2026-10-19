"""Admin endpoints for benchmark configuration."""
from __future__ import annotations

import json

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.config import settings

router = APIRouter(prefix="/admin", tags=["admin"])

WEIGHTS_FILE = settings.codiemind_data_dir / "scorer_weights.json"


class ScorerWeightsRequest(BaseModel):
    recency: float = Field(..., ge=0.0, le=1.0)
    importance: float = Field(..., ge=0.0, le=1.0)
    relevance: float = Field(..., ge=0.0, le=1.0)


class ScorerWeightsResponse(BaseModel):
    recency: float
    importance: float
    relevance: float
    persisted: bool


@router.post(
    "/scorer_weights",
    response_model=ScorerWeightsResponse,
    summary="Update scorer weights (benchmark use only)",
)
async def update_scorer_weights(payload: ScorerWeightsRequest) -> ScorerWeightsResponse:
    """Update in-memory scorer weights and persist to disk."""
    settings.scorer_recency_weight = payload.recency
    settings.scorer_importance_weight = payload.importance
    settings.scorer_relevance_weight = payload.relevance

    WEIGHTS_FILE.parent.mkdir(parents=True, exist_ok=True)
    WEIGHTS_FILE.write_text(json.dumps({
        "recency": payload.recency,
        "importance": payload.importance,
        "relevance": payload.relevance,
    }, indent=2))

    return ScorerWeightsResponse(
        recency=payload.recency,
        importance=payload.importance,
        relevance=payload.relevance,
        persisted=True,
    )


@router.get(
    "/scorer_weights",
    response_model=ScorerWeightsResponse,
    summary="Get current scorer weights",
)
async def get_scorer_weights() -> ScorerWeightsResponse:
    """Return current scorer weights."""
    return ScorerWeightsResponse(
        recency=settings.scorer_recency_weight,
        importance=settings.scorer_importance_weight,
        relevance=settings.scorer_relevance_weight,
        persisted=WEIGHTS_FILE.exists(),
    )
