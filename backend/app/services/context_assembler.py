"""Six-slot prompt assembler with per-slot token budgets."""
from __future__ import annotations

import logging
from dataclasses import dataclass

from app.config import settings
from app.models import Decision
from app.services.preference_scorer import ScoredPreference

logger = logging.getLogger(__name__)


@dataclass
class SlotContent:
    """One slot in the assembled prompt."""

    name: str
    tokens: int
    content: str


@dataclass
class AssembledPrompt:
    """The fully assembled prompt with slot breakdown."""

    text: str
    slots: list[SlotContent]
    total_tokens: int
    budget: int
    user_query: str


def _estimate_tokens(text: str) -> int:
    # Simple approximation: ~4 chars per token for ASCII/code.
    return len(text) // 4


def _truncate_to_budget(text: str, budget_tokens: int) -> str:
    """Truncate text to fit within the token budget."""
    max_chars = budget_tokens * 4
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + "..."


def _build_preferences_block(
    scored: list[ScoredPreference],
    budget_tokens: int,
) -> str:
    """Format preferences, truncating lowest-score-first if over budget."""
    if not scored:
        return "(none stored)"

    lines: list[tuple[float, str]] = []
    for sp in scored:
        p = sp.preference
        line = f"- [pref:{p.id}] (importance {p.importance}/10, category {p.category}) {p.content}"
        lines.append((sp.score, line))

    block = "\n".join(line for _, line in lines)
    if _estimate_tokens(block) <= budget_tokens:
        return block

    lines.sort(key=lambda x: x[0])
    while lines and _estimate_tokens("\n".join(l for _, l in lines)) > budget_tokens:
        lines.pop(0)

    if not lines:
        return "(none stored)"
    return "\n".join(line for _, line in lines)


def _build_static_preferences_block(text: str, budget_tokens: int) -> str:
    """Arm B: the whole concatenated rule file, injected verbatim.

    The benchmark requires arm B to be a real implementation of the deployed
    mechanism, not a strawman -- if a weakened baseline manufactures arm C's
    advantage, a reviewer who has read Guardrails will see it immediately.
    So this refuses to truncate: an over-budget file raises rather than
    silently dropping the rules the baseline is supposed to be carrying.
    """
    tokens = _estimate_tokens(text)
    if tokens > budget_tokens:
        raise ValueError(
            f"Static preference file is {tokens} tokens, over the "
            f"{budget_tokens}-token slot budget. Truncating it would weaken arm B "
            "into a strawman. Raise "
            "slot_static_preferences_budget instead."
        )
    return text if text.strip() else "(none stored)"


def _build_decisions_block(
    decisions: list[Decision],
    budget_tokens: int,
) -> str:
    """Format decisions, truncating if over budget."""
    if not decisions:
        return "(none stored)"

    lines: list[str] = []
    for d in decisions:
        line = f"- [dec:{d.id}] (importance {d.importance}/10) {d.content} — Rationale: {d.rationale}"
        lines.append(line)

    block = "\n".join(lines)
    if _estimate_tokens(block) <= budget_tokens:
        return block

    while lines and _estimate_tokens("\n".join(lines)) > budget_tokens:
        lines.pop()

    if not lines:
        return "(none stored)"
    return "\n".join(lines)


def _build_history_block(
    history: list[tuple[str, str]],
    budget_tokens: int,
) -> str:
    """Format conversation history, truncating oldest-first if over budget."""
    if not history:
        return "(new conversation)"

    lines: list[str] = []
    for role, content in history:
        label = "User" if role == "user" else "Assistant"
        lines.append(f"{label}: {content}")

    block = "\n".join(lines)
    if _estimate_tokens(block) <= budget_tokens:
        return block

    while lines and _estimate_tokens("\n".join(lines)) > budget_tokens:
        lines.pop(0)

    if not lines:
        return "(new conversation)"
    return "\n".join(lines)


SYSTEM_PREAMBLE = (
    "SYSTEM:\n"
    "You are CodieMind, an AI coding assistant that respects stored developer "
    "preferences and project decisions. Apply preferences and decisions precisely. "
    "When a preference applies to generated code, follow it exactly."
)

SLOT4_PLACEHOLDER = "(empty in FYP-1; reserved for FYP-2 Code Memory)"

CLOSING_INSTRUCTION = (
    "Answer slot 6 above, applying the preferences in slot 2 and decisions in "
    "slot 3 exactly. When you apply a preference or decision, cite its id in "
    "brackets, like [pref:abc-123] or [dec:def-456], after the relevant code "
    "block or sentence."
)

CLOSING_INSTRUCTION_MIDDLE = (
    "Answer slot 6 above, applying the preferences in slot 4 and decisions in "
    "slot 3 exactly. When you apply a preference or decision, cite its id in "
    "brackets, like [pref:abc-123] or [dec:def-456], after the relevant code "
    "block or sentence."
)

PREFS_MOVED_PLACEHOLDER = "(preferences moved to slot 4 — baseline experiment)"


def assemble(
    user_query: str,
    scored_preferences: list[ScoredPreference],
    decisions: list[Decision],
    history: list[tuple[str, str]],
    place_preferences_in_slot: int = 2,
    static_preferences: str | None = None,
) -> AssembledPrompt:
    """Build the six-slot prompt and return the assembled result.

    `static_preferences` is arm B: all stored preferences
    concatenated into one file and injected whole, rules-file style. When given
    it replaces the retrieved block in the same slot, so arms B and C differ
    only in how the text was selected -- everything else about the prompt, the
    provider, the model and the decoding is identical.
    """
    if place_preferences_in_slot not in (2, 4):
        raise ValueError("place_preferences_in_slot must be 2 or 4")
    if static_preferences is not None and scored_preferences:
        raise ValueError(
            "static_preferences and retrieved preferences are mutually exclusive: "
            "arm B injects the whole file, arm C retrieves top-k."
        )

    query_truncated = _truncate_to_budget(user_query, settings.slot_user_query_budget)
    if static_preferences is not None:
        prefs_block = _build_static_preferences_block(
            static_preferences, settings.slot_static_preferences_budget
        )
    else:
        prefs_block = _build_preferences_block(
            scored_preferences, settings.slot_preferences_budget
        )
    decs_block = _build_decisions_block(decisions, settings.slot_decisions_budget)
    hist_block = _build_history_block(history, settings.slot_history_budget)

    if place_preferences_in_slot == 2:
        slot2_content = prefs_block
        slot4_content = SLOT4_PLACEHOLDER
        closing = CLOSING_INSTRUCTION
    else:
        slot2_content = PREFS_MOVED_PLACEHOLDER
        slot4_content = prefs_block
        closing = CLOSING_INSTRUCTION_MIDDLE

    prompt = (
        f"{SYSTEM_PREAMBLE}\n\n"
        f"=== Slot 1: User Query ===\n{query_truncated}\n\n"
        f"=== Slot 2: Stored Preferences ===\n{slot2_content}\n\n"
        f"=== Slot 3: Project Decisions ===\n{decs_block}\n\n"
        f"=== Slot 4: Code Context ===\n{slot4_content}\n\n"
        f"=== Slot 5: Recent Conversation ===\n{hist_block}\n\n"
        f"=== Slot 6: User Query (repeated for recency) ===\n{query_truncated}\n\n"
        f"{closing}"
    )

    slot2_tokens = _estimate_tokens(slot2_content) if place_preferences_in_slot == 2 else 0
    slot4_tokens = _estimate_tokens(slot4_content) if place_preferences_in_slot == 4 else 0

    slots = [
        SlotContent(name="User Query", tokens=_estimate_tokens(query_truncated), content=query_truncated),
        SlotContent(name="Stored Preferences", tokens=slot2_tokens, content=slot2_content),
        SlotContent(name="Project Decisions", tokens=_estimate_tokens(decs_block), content=decs_block),
        SlotContent(name="Code Context", tokens=slot4_tokens, content=slot4_content),
        SlotContent(name="Recent Conversation", tokens=_estimate_tokens(hist_block), content=hist_block),
        SlotContent(name="User Query (repeated for recency)", tokens=_estimate_tokens(query_truncated), content=query_truncated),
    ]

    total_tokens = sum(s.tokens for s in slots)
    budget = (
        settings.slot_user_query_budget
        + settings.slot_preferences_budget
        + settings.slot_decisions_budget
        + settings.slot_code_context_budget
        + settings.slot_history_budget
        + settings.slot_repeated_query_budget
    )

    return AssembledPrompt(
        text=prompt,
        slots=slots,
        total_tokens=total_tokens,
        budget=budget,
        user_query=user_query,
    )
