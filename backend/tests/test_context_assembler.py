"""Tests for ContextAssembler slot assembly."""
from __future__ import annotations

from datetime import datetime, timezone

from app.models import Decision, Preference
from app.services.context_assembler import assemble
from app.services.preference_scorer import ScoredPreference


def _make_scored(content: str, pref_id: str = "aaaa-bbbb-cccc-dddd-eeeeeeeeeeee", score: float = 0.8) -> ScoredPreference:
    return ScoredPreference(
        preference=Preference(
            id=pref_id,
            content=content,
            category="style",
            scope_type="project",
            importance=5,
            source="explicit",
            created_at=datetime.now(timezone.utc),
        ),
        score=score,
        relevance=0.9,
        importance=0.5,
        recency=0.9,
    )


def _make_decision(content: str, rationale: str, dec_id: str = "dddd-eeee-ffff-0000-111111111111") -> Decision:
    return Decision(
        id=dec_id,
        content=content,
        rationale=rationale,
        scope_type="project",
        importance=7,
        created_at=datetime.now(timezone.utc),
    )


def test_all_six_slots_present():
    result = assemble("hello", [], [], [])
    assert len(result.slots) == 6
    expected_names = [
        "User Query",
        "Stored Preferences",
        "Project Decisions",
        "Code Context",
        "Recent Conversation",
        "User Query (repeated for recency)",
    ]
    for i, name in enumerate(expected_names):
        assert result.slots[i].name == name


def test_user_query_in_slot1_and_slot6():
    result = assemble("test query", [], [], [])
    assert result.slots[0].content == "test query"
    assert result.slots[5].content == "test query"


def test_empty_preferences_renders_none_stored():
    result = assemble("test", [], [], [])
    assert result.slots[1].content == "(none stored)"


def test_empty_decisions_renders_none_stored():
    result = assemble("test", [], [], [])
    assert result.slots[2].content == "(none stored)"


def test_empty_history_renders_new_conversation():
    result = assemble("test", [], [], [])
    assert result.slots[4].content == "(new conversation)"


def test_slot4_is_empty_placeholder():
    result = assemble("test", [], [], [])
    assert "FYP-1" in result.slots[3].content
    assert result.slots[3].tokens == 0


def test_preferences_included_in_output():
    sp = _make_scored("Use arrow functions")
    result = assemble("test", [sp], [], [])
    assert "Use arrow functions" in result.slots[1].content
    assert "[pref:" in result.slots[1].content


def test_decisions_included_in_output():
    dec = _make_decision("Use Repository pattern", "DB swap later")
    result = assemble("test", [], [dec], [])
    assert "Use Repository pattern" in result.slots[2].content
    assert "[dec:" in result.slots[2].content


def test_history_included_in_output():
    history = [("user", "hello"), ("assistant", "hi there")]
    result = assemble("test", [], [], history)
    assert "User: hello" in result.slots[4].content
    assert "Assistant: hi there" in result.slots[4].content


def test_preference_over_budget_truncates_lowest_score():
    prefs = [
        _make_scored("A" * 3000, pref_id="aaaa-bbbb-cccc-dddd-eeeeeeeeee01", score=0.9),
        _make_scored("B" * 3000, pref_id="aaaa-bbbb-cccc-dddd-eeeeeeeeee02", score=0.1),
    ]
    result = assemble("test", prefs, [], [])
    assert "A" * 100 in result.slots[1].content
    assert "B" * 100 not in result.slots[1].content


def test_placement_slot4_swaps_preferences():
    sp = _make_scored("Use arrow functions")
    result = assemble("test", [sp], [], [], place_preferences_in_slot=4)
    assert "preferences moved to slot 4" in result.slots[1].content
    assert "Use arrow functions" in result.slots[3].content
    assert "[pref:" in result.slots[3].content


def test_placement_slot2_is_default():
    sp = _make_scored("Use arrow functions")
    result = assemble("test", [sp], [], [])
    assert "Use arrow functions" in result.slots[1].content
    assert "FYP-1" in result.slots[3].content


def test_placement_invalid_raises():
    import pytest
    with pytest.raises(ValueError):
        assemble("test", [], [], [], place_preferences_in_slot=3)


def test_history_over_budget_truncates_oldest():
    history = [(f"user", f"message {i} " + "x" * 500) for i in range(20)]
    result = assemble("test", [], [], history)
    assert "message 0" not in result.slots[4].content
