"""Embeddings may use their own endpoint.

Fails if EMBEDDING_BASE_URL is ignored (embeddings would silently go to the chat endpoint) or if
setting it changes the chat client.
"""
from app import llm_client
from app.config import settings


def _backend():
    return llm_client._OpenAIBackend(api_key="k", chat_model="m-2024-01-01", embedding_model="e")


def test_unset_uses_chat_client(monkeypatch):
    monkeypatch.setattr(settings, "embedding_base_url", "")
    b = _backend()
    assert b._embed_client is b._client


def test_set_routes_embeddings_only(monkeypatch):
    monkeypatch.setattr(settings, "embedding_base_url", "http://127.0.0.1:11434/v1")
    b = _backend()
    assert b._embed_client is not b._client
    assert str(b._embed_client.base_url).startswith("http://127.0.0.1:11434/v1")
    assert not str(b._client.base_url).startswith("http://127.0.0.1:11434")
