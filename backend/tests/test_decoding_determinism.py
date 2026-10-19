"""Decoding-parameter tests.

`chat.completions.create(model, messages)` was called with no temperature, no
seed and no max_tokens, so OpenAI's default temperature of 1.0 applied. These
tests assert the parameters actually reach the provider call and that the
per-call record carries what §2 requires. They use a stub client object, so no
network and no credentials.
"""
from __future__ import annotations

from types import SimpleNamespace

import pytest

from app.config import settings
from app.llm_client import _OpenAIBackend, is_pinned_model


class _StubCompletions:
    def __init__(self) -> None:
        self.kwargs: dict = {}

    def create(self, **kwargs):
        self.kwargs = kwargs
        return SimpleNamespace(
            id="chatcmpl-stub",
            model=kwargs["model"],
            system_fingerprint="fp_stub",
            usage=SimpleNamespace(prompt_tokens=11, completion_tokens=7),
            choices=[
                SimpleNamespace(
                    finish_reason="stop",
                    message=SimpleNamespace(content="ok"),
                )
            ],
        )


def _backend() -> tuple[_OpenAIBackend, _StubCompletions]:
    backend = _OpenAIBackend.__new__(_OpenAIBackend)
    completions = _StubCompletions()
    backend._client = SimpleNamespace(chat=SimpleNamespace(completions=completions))
    backend.chat_model = settings.openai_chat_model
    backend.embedding_model = settings.openai_embedding_model
    return backend, completions


def test_decoding_parameters_are_sent_explicitly() -> None:
    backend, completions = _backend()
    backend.chat("hello")

    assert completions.kwargs["temperature"] == settings.llm_temperature == 0.0
    assert completions.kwargs["max_tokens"] == settings.llm_max_tokens
    assert completions.kwargs["seed"] == settings.llm_seed


def test_seed_is_omitted_when_unset(monkeypatch) -> None:
    monkeypatch.setattr(settings, "llm_seed", None)
    backend, completions = _backend()
    backend.chat("hello")

    assert "seed" not in completions.kwargs


def test_call_record_carries_everything_the_benchmark_requires() -> None:
    backend, _ = _backend()
    _, record = backend.chat("hello")

    for field in (
        "provider", "model", "temperature", "max_tokens", "seed",
        "response_id", "finish_reason", "sdk", "timestamp",
    ):
        assert field in record, f"call record is missing {field!r}"
    assert record["response_id"] == "chatcmpl-stub"
    assert record["system_fingerprint"] == "fp_stub"
    assert record["sdk"].startswith("openai==")
    assert record["model"] == settings.openai_chat_model


def test_configured_openai_model_is_a_pinned_snapshot() -> None:
    """The floating `gpt-4o-mini` alias must not be what a run records."""
    assert is_pinned_model(settings.openai_chat_model), (
        f"{settings.openai_chat_model!r} is a floating alias"
    )


def test_pinning_check_rejects_an_alias_when_required(monkeypatch) -> None:
    from app import llm_client

    monkeypatch.setattr(settings, "require_pinned_chat_model", True)
    monkeypatch.setattr(settings, "openai_chat_model", "gpt-4o-mini")
    monkeypatch.setattr(settings, "openai_api_key", "sk-test")
    llm_client.get_llm_client.cache_clear()
    try:
        with pytest.raises(ValueError, match="floating alias"):
            llm_client.get_llm_client()
    finally:
        llm_client.get_llm_client.cache_clear()
