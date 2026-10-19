"""FastAPI application entry point."""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.config import settings
from app.db import init_db
from app.routers import admin, chat, context, memory


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Startup: create SQLite tables if absent, load persisted scorer weights."""
    await init_db()
    _load_persisted_weights()
    yield


def _load_persisted_weights() -> None:
    import json
    weights_file = settings.codiemind_data_dir / "scorer_weights.json"
    if weights_file.exists():
        data = json.loads(weights_file.read_text())
        settings.scorer_recency_weight = data["recency"]
        settings.scorer_importance_weight = data["importance"]
        settings.scorer_relevance_weight = data["relevance"]


app = FastAPI(
    title="CodieMind Backend",
    version="0.3.0",
    description="Dual-memory architecture for preference-persistent code generation",
    lifespan=lifespan,
)

app.include_router(memory.router)
app.include_router(chat.router)
app.include_router(context.router)
app.include_router(admin.router)


@app.get("/health")
async def health() -> dict[str, str]:
    """Liveness probe."""
    from app.llm_client import get_llm_client

    client = get_llm_client()
    return {
        "status": "ok",
        "chat_model": client.chat_model,
        "embedding_model": client.embedding_model,
    }
