"""Centralized configuration loaded from environment variables."""
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/.env, resolved absolutely from this file rather than from the working
# directory. `env_file=".env"` is CWD-relative, so the same command succeeded from
# backend/ and failed from the project root: /health calls get_llm_client(), which
# raised ValueError when neither key was found (,
# test_health_returns_ok). Configuration must not depend on where you stood when
# you invoked it.
_ENV_FILE = Path(__file__).resolve().parents[1] / ".env"


class Settings(BaseSettings):
    """Application settings.

    Reads from the environment and from backend/.env. Secrets (API keys) must come
    from the environment; nothing secret is committed to source control.
    """

    model_config = SettingsConfigDict(
        env_file=_ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Gemini / Google GenAI
    gemini_api_key: str = ""
    # NOT a pinned snapshot. Google publishes dated preview ids but retires them,
    # and no stable dated id exists for this model. The Gemini path therefore
    # fails the pinning check below and must not be used for a benchmark run
    # until a dated id is chosen and recorded here.
    gemini_chat_model: str = "gemini-2.5-flash-lite"
    gemini_embedding_model: str = "gemini-embedding-001"

    # OpenAI
    openai_api_key: str = ""
    # Pinned dated snapshot, not the floating `gpt-4o-mini` alias
    #: the alias silently re-points and makes a run
    # unreplicable. Changing this string changes the system under test.
    openai_chat_model: str = "gpt-4o-mini-2024-07-18"
    # OpenAI publishes no dated snapshots for embedding models, so this is the
    # only available identifier. Recorded per run rather than pinned.
    openai_embedding_model: str = "text-embedding-3-small"
    # Optional separate OpenAI-compatible endpoint for embeddings only (used by the
    # benchmark runs): one local embedding model for every chat model, so
    # arm C's retrieval is held fixed across model runs. Unset = embeddings go to
    # the chat endpoint exactly as before.
    embedding_base_url: str = ""
    embedding_api_key: str = "unused"

    # Provider selection. Values: "openai" (default) or "gemini".
    llm_provider: str = "openai"

    # Decoding. Nothing here may be left to a provider
    # default: OpenAI defaults temperature to 1.0, which is why no two repeats
    # of the FYP-1 run produced byte-identical text.
    llm_temperature: float = 0.0
    llm_max_tokens: int = 1024
    # OpenAI accepts `seed` as best-effort only, and does not guarantee
    # determinism even with it. It is set and recorded so that variance can be
    # measured rather than assumed. Gemini's SDK takes it via GenerateContentConfig.
    llm_seed: int | None = 12345
    # When true, refuse to start on a chat model whose id is not a dated
    # snapshot. Benchmark runs set this; interactive use need not.
    require_pinned_chat_model: bool = False

    # Scorer weights (must sum to 1.0)
    scorer_recency_weight: float = 0.2
    scorer_importance_weight: float = 0.3
    scorer_relevance_weight: float = 0.5

    # Context assembler slot budgets (tokens, approx len//4)
    slot_user_query_budget: int = 256
    slot_preferences_budget: int = 800
    slot_decisions_budget: int = 400
    slot_code_context_budget: int = 1500
    slot_history_budget: int = 800
    slot_repeated_query_budget: int = 256
    # Arm B injects every stored preference at once, so it needs far more room
    # than the top-k slot. Sized for the largest benchmark store (120
    # preferences); over-budget raises rather than truncating.
    slot_static_preferences_budget: int = 8000

    # Conversation history (Slot 5).
    # Session isolation: benchmark runs disable history entirely so Slot 5 is
    # empty, removing the cross-session confound rather than modelling it.
    # Set HISTORY_ENABLED=false in the environment for every benchmark run
    # (pydantic-settings has no env_prefix here, so the var is the bare field name).
    history_enabled: bool = True
    history_limit: int = 8

    # Storage paths (resolved relative to repo root, i.e. parent of backend/)
    codiemind_data_dir: Path = Path(__file__).resolve().parents[2] / ".codiemind"

    @property
    def sqlite_path(self) -> Path:
        return self.codiemind_data_dir / "memory.db"

    @property
    def chroma_path(self) -> Path:
        return self.codiemind_data_dir / "chroma"


settings = Settings()
