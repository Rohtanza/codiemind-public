"""Verifier contract.

Every verifier, T1 included, yields a VerdictT. Evidence is mandatory on SATISFIED and VIOLATED;
NOT_APPLICABLE means the unit has no instance of the governed construct. Pipeline outcomes that
are not verdicts (NO_CODE, MALFORMED) live on ResponseVerdict, never on VerdictT, so they can
never be counted as a violation (items 1 and 3).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

Outcome = Literal["SATISFIED", "VIOLATED", "NOT_APPLICABLE"]
Tier = Literal["T1", "T2", "T3", "T4"]
OUTCOMES = ("SATISFIED", "VIOLATED", "NOT_APPLICABLE")
TIERS = ("T1", "T2", "T3", "T4")


class ContractError(Exception):
    """A verifier broke the contract. Never converted into a verdict."""


@dataclass(frozen=True)
class Evidence:
    file: str
    line: int
    column: int
    node_kind: str
    text: str


@dataclass(frozen=True)
class VerdictT:
    outcome: Outcome
    tier: Tier
    evidence: tuple[Evidence, ...]
    verifier_id: str

    def __post_init__(self) -> None:
        if self.outcome not in OUTCOMES:
            raise ContractError(f"{self.verifier_id}: outcome {self.outcome!r}")
        if self.tier not in TIERS:
            raise ContractError(f"{self.verifier_id}: tier {self.tier!r}")
        if self.outcome in ("SATISFIED", "VIOLATED") and not self.evidence:
            raise ContractError(f"{self.verifier_id}: {self.outcome} without evidence (§4)")


@dataclass(frozen=True)
class ResponseVerdict:
    """Result of the whole pipeline on one LLM response: [E] -> [G] -> [V]."""
    outcome: Literal["SATISFIED", "VIOLATED", "NOT_APPLICABLE", "NO_CODE", "MALFORMED"]
    verifier_id: str
    unit_verdicts: tuple[VerdictT, ...] = field(default=())
    detail: str = ""


def combine(verdicts: list[VerdictT], verifier_id: str) -> str:
    """All-instances semantics across units."""
    outs = {v.outcome for v in verdicts}
    if "VIOLATED" in outs:
        return "VIOLATED"
    if "SATISFIED" in outs:
        return "SATISFIED"
    return "NOT_APPLICABLE"
