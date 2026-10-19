"""LLM client wrapper with pluggable backends (OpenAI, Gemini).

Decoding is pinned, not left to provider defaults, and every chat call emits a
record of exactly what was sent and what came back.
Determinism is measured, never assumed: see `scripts/measure_determinism.py`.
"""
from __future__ import annotations

import asyncio
import logging
import re
from datetime import datetime, timezone
from functools import lru_cache
from importlib.metadata import PackageNotFoundError, version

from app.config import settings

logger = logging.getLogger(__name__)

# A pinned chat model carries an explicit version: a full date
# (gpt-4o-mini-2024-07-18), a compact date (-20240718), or a dated preview
# suffix (gemini-2.5-flash-preview-06-17). A bare family name is a floating alias.
_PINNED_MODEL_RE = re.compile(r"(\d{4}-\d{2}-\d{2}|-\d{2}-\d{2}|-\d{6,8})$")


def is_pinned_model(model: str) -> bool:
    """True when `model` names a specific dated snapshot rather than an alias."""
    return bool(_PINNED_MODEL_RE.search(model))


def _sdk_version(package: str) -> str:
    try:
        return version(package)
    except PackageNotFoundError:  # pragma: no cover - packaging accident
        return "unknown"


class _GeminiBackend:
    def __init__(self, api_key: str, chat_model: str, embedding_model: str) -> None:
        from google import genai

        self._client = genai.Client(api_key=api_key)
        self.chat_model = chat_model
        self.embedding_model = embedding_model

    def embed(self, text: str) -> list[float]:
        response = self._client.models.embed_content(
            model=self.embedding_model,
            contents=text,
        )
        return list(response.embeddings[0].values)

    def chat(self, prompt: str) -> tuple[str, dict]:
        from google.genai import types

        config = types.GenerateContentConfig(
            temperature=settings.llm_temperature,
            max_output_tokens=settings.llm_max_tokens,
            seed=settings.llm_seed,
        )
        response = self._client.models.generate_content(
            model=self.chat_model,
            contents=prompt,
            config=config,
        )
        candidate = (response.candidates or [None])[0]
        record = {
            "provider": "gemini",
            "model": self.chat_model,
            "temperature": settings.llm_temperature,
            "max_tokens": settings.llm_max_tokens,
            "seed": settings.llm_seed,
            "response_id": getattr(response, "response_id", None),
            "finish_reason": str(getattr(candidate, "finish_reason", None)),
            "system_fingerprint": None,
            "sdk": f"google-genai=={_sdk_version('google-genai')}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        return response.text or "", record


class _OpenAIBackend:
    def __init__(self, api_key: str, chat_model: str, embedding_model: str) -> None:
        from openai import OpenAI

        self._client = OpenAI(api_key=api_key)
        # Embeddings use their own endpoint when one is configured; otherwise the chat client.
        self._embed_client = (
            OpenAI(api_key=settings.embedding_api_key, base_url=settings.embedding_base_url)
            if settings.embedding_base_url else self._client
        )
        self.chat_model = chat_model
        self.embedding_model = embedding_model

    def embed(self, text: str) -> list[float]:
        response = self._embed_client.embeddings.create(
            model=self.embedding_model,
            input=text,
        )
        return response.data[0].embedding

    def chat(self, prompt: str) -> tuple[str, dict]:
        kwargs = {
            "model": self.chat_model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": settings.llm_temperature,
            "max_tokens": settings.llm_max_tokens,
        }
        if settings.llm_seed is not None:
            kwargs["seed"] = settings.llm_seed
        response = self._client.chat.completions.create(**kwargs)
        choice = response.choices[0]
        usage = getattr(response, "usage", None)
        record = {
            "provider": "openai",
            "model": response.model,
            "temperature": settings.llm_temperature,
            "max_tokens": settings.llm_max_tokens,
            "seed": settings.llm_seed,
            "response_id": response.id,
            "finish_reason": choice.finish_reason,
            "system_fingerprint": getattr(response, "system_fingerprint", None),
            "prompt_tokens": getattr(usage, "prompt_tokens", None),
            "completion_tokens": getattr(usage, "completion_tokens", None),
            "sdk": f"openai=={_sdk_version('openai')}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        return choice.message.content or "", record


class LLMClient:
    def __init__(self, backend: _OpenAIBackend | _GeminiBackend) -> None:
        self._backend = backend
        # Populated on every chat call so the caller can record provenance
        # without changing chat_completion's return type.
        self.last_call_record: dict | None = None

    @property
    def chat_model(self) -> str:
        return self._backend.chat_model

    @property
    def embedding_model(self) -> str:
        return self._backend.embedding_model

    async def generate_embedding(self, text: str) -> list[float]:
        return await asyncio.to_thread(self._backend.embed, text)

    async def chat_completion(self, prompt: str) -> str:
        text, record = await asyncio.to_thread(self._backend.chat, prompt)
        record["response_chars"] = len(text)
        self.last_call_record = record
        if record.get("finish_reason") == "length":
            logger.warning(
                "Response hit max_tokens=%s and was truncated; raise llm_max_tokens "
                "or the trial is not scoreable.",
                settings.llm_max_tokens,
            )
        return text


def _check_pinned(model: str) -> None:
    """Refuse a floating alias when the run demands a replicable model string."""
    if settings.require_pinned_chat_model and not is_pinned_model(model):
        raise ValueError(
            f"Chat model {model!r} is a floating alias, not a dated snapshot. "
            "A benchmark run on an alias is unreplicable. "
            "Pin it in config.py, or unset REQUIRE_PINNED_CHAT_MODEL for "
            "interactive use."
        )


@lru_cache(maxsize=1)
def get_llm_client() -> LLMClient:
    provider = settings.llm_provider

    if provider == "openai" and settings.openai_api_key:
        _check_pinned(settings.openai_chat_model)
        backend = _OpenAIBackend(
            api_key=settings.openai_api_key,
            chat_model=settings.openai_chat_model,
            embedding_model=settings.openai_embedding_model,
        )
        return LLMClient(backend)

    if provider == "openai" and not settings.openai_api_key:
        if settings.gemini_api_key:
            logger.warning(
                "OPENAI_API_KEY is empty; falling back to Gemini.",
            )
            provider = "gemini"
        else:
            raise ValueError(
                "Neither OPENAI_API_KEY nor GEMINI_API_KEY is set. "
                "Set at least one in backend/.env before starting the server."
            )

    if provider == "gemini":
        if not settings.gemini_api_key:
            raise ValueError(
                "GEMINI_API_KEY is empty. Set it in backend/.env before starting the server."
            )
        _check_pinned(settings.gemini_chat_model)
        backend = _GeminiBackend(
            api_key=settings.gemini_api_key,
            chat_model=settings.gemini_chat_model,
            embedding_model=settings.gemini_embedding_model,
        )
        return LLMClient(backend)

    raise ValueError(f"Unknown llm_provider: {provider!r}. Use 'openai' or 'gemini'.")
