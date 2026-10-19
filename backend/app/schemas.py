"""Pydantic schemas for API request and response bodies."""
from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class PreferenceCategory(str, Enum):
    STYLE = "style"
    NAMING = "naming"
    TOOL = "tool"
    ARCHITECTURE = "architecture"
    CONSTRAINT = "constraint"
    OTHER = "other"


class PreferenceScope(str, Enum):
    PROJECT = "project"


class PreferenceSource(str, Enum):
    EXPLICIT = "explicit"
    IMPLICIT = "implicit"


# --- Remember ---

class RememberRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)
    category: PreferenceCategory = PreferenceCategory.OTHER
    scope_type: PreferenceScope = PreferenceScope.PROJECT
    scope_path: str | None = None
    importance: int = Field(default=5, ge=1, le=10)
    source: PreferenceSource = PreferenceSource.EXPLICIT


class RememberResponse(BaseModel):
    id: str
    content: str
    category: PreferenceCategory
    scope_type: PreferenceScope
    importance: int
    created_at: datetime


# --- Decide ---

class DecideRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)
    rationale: str = Field(..., min_length=1, max_length=2000)
    scope_type: PreferenceScope = PreferenceScope.PROJECT
    scope_path: str | None = None
    importance: int = Field(default=7, ge=1, le=10)


class DecideResponse(BaseModel):
    id: str
    content: str
    rationale: str
    scope_type: PreferenceScope
    importance: int
    created_at: datetime


# --- Forget ---

class ForgetResponse(BaseModel):
    deleted: bool
    kind: str


# --- List ---

class PreferenceItem(BaseModel):
    id: str
    content: str
    category: PreferenceCategory
    scope_type: PreferenceScope
    importance: int
    source: PreferenceSource
    created_at: datetime


class DecisionItem(BaseModel):
    id: str
    content: str
    rationale: str
    scope_type: PreferenceScope
    importance: int
    created_at: datetime


class ListMemoriesResponse(BaseModel):
    preferences: list[PreferenceItem]
    decisions: list[DecisionItem]


# --- Chat ---

class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=4000)
    file_path: str | None = None
    # Scopes conversation history. Turns are only ever read back into a prompt
    # whose session_id matches the one they were written under, so two sessions
    # cannot see each other's turns. Omitting it puts the
    # turn in the unnamed NULL bucket, which is likewise isolated.
    session_id: str | None = Field(default=None, max_length=64)
    # Per-request override of settings.history_enabled. None = use the global.
    history_enabled: bool | None = None
    # Arm B: all stored preferences concatenated into one
    # file, injected whole in place of retrieval. Mutually exclusive with a
    # non-empty preference store.
    static_preferences: str | None = Field(default=None, max_length=200_000)


class SlotBreakdown(BaseModel):
    name: str
    tokens: int
    content: str


class PromptBreakdown(BaseModel):
    assembled_at: datetime
    user_query: str
    # The exact text sent to the provider. Optional so an older cached
    # breakdown still validates.
    prompt_text: str | None = None
    slots: list[SlotBreakdown]
    total_tokens: int
    budget: int


class LLMCallRecord(BaseModel):
    """What was actually sent to the provider and what came back.

    Run provenance requires model, temperature, seed, max_tokens, provider
    response id, timestamp and SDK version on every call. Optional on the
    response so a mocked client simply omits it.
    """

    model_config = ConfigDict(extra="allow")

    provider: str
    model: str
    temperature: float
    max_tokens: int
    seed: int | None = None
    response_id: str | None = None
    finish_reason: str | None = None
    system_fingerprint: str | None = None
    sdk: str
    timestamp: str


class ChatResponse(BaseModel):
    text: str
    applied_preference_ids: list[str]
    applied_decision_ids: list[str]
    prompt_breakdown: PromptBreakdown
    llm_call: LLMCallRecord | None = None
