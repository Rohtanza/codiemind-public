#!/usr/bin/env python3
"""GATE G3: the instrument regression test, written first.

A response whose PROSE contains a banned string but whose CODE conforms must return SATISFIED.

The test is shown able to fail on the known defect: the FYP-1 grader matched
`must_not_contain_any` strings against the whole response, and `naive_grader` below reproduces
that; the test asserts it returns VIOLATED on the same input. A test passing only because the
input lacked the banned string would fail that assertion. The violating-code mirror shows the
SATISFIED is not vacuous.

Run: python3 tests/test_g3_regression.py      (exit 0 = G3 green)
"""
from __future__ import annotations

import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from registry import active  # noqa: E402
from runtime import score_response  # noqa: E402

BANNED = ["function ("]  # the FYP-1 cases.json must_not_contain_any shape

PROSE_WITH_BANNED = (
    "Here is the refactor. I avoided `function (` entirely and did not use a function "
    "declaration like `function add(a, b) {` anywhere — instead of a function declaration "
    "every helper is an arrow function:\n\n"
)
CONFORMING = "```ts\nexport const add = (a: number, b: number): number => a + b;\n" \
             "export const twice = (f: (x: number) => number) => (x: number) => f(f(x));\n```\n"
VIOLATING = "```ts\nexport const add = function (a: number, b: number) { return a + b; };\n```\n"
AFTER = "\nNote: no `function (` was harmed in this answer.\n"


def naive_grader(response: str) -> str:
    """The FYP-1 defect, reproduced: banned strings searched in the ENTIRE response."""
    return "VIOLATED" if any(b in response for b in BANNED) else "SATISFIED"


def main() -> int:
    entry = active("REF_T2_arrow", "ts")
    assert entry, "reference T2 verifier not registered"
    checks = []

    def check(name: str, got: str, want: str) -> None:
        checks.append((name, got, want, got == want))

    resp = PROSE_WITH_BANNED + CONFORMING + AFTER
    assert any(b in resp.replace(CONFORMING, "") for b in BANNED), "prose must carry the banned string"
    check("G3: banned string in prose, conforming code -> SATISFIED",
          score_response(resp, entry).outcome, "SATISFIED")
    check("discrimination: FYP-1 whole-response grader on the same input -> VIOLATED",
          naive_grader(resp), "VIOLATED")
    check("mirror: same prose, violating code -> VIOLATED",
          score_response(PROSE_WITH_BANNED + VIOLATING + AFTER, entry).outcome, "VIOLATED")
    check("prose only, banned string, no code -> NO_CODE (never VIOLATED)",
          score_response(PROSE_WITH_BANNED + AFTER, entry).outcome, "NO_CODE")
    check("unparseable code -> MALFORMED (never VIOLATED)",
          score_response(PROSE_WITH_BANNED + "```ts\nconst = => ;\n```\n", entry).outcome, "MALFORMED")
    check("banned string inside a code string literal, conforming code -> SATISFIED",
          score_response("```ts\nconst s = \"function (\";\nconst f = () => s;\n```", entry).outcome,
          "SATISFIED")
    for name, got, want, ok in checks:
        print(f"{'PASS' if ok else 'FAIL'}  {name}  (got {got})")
    failed = [c for c in checks if not c[3]]
    print("\nGATE G3:", "GREEN" if not failed else f"RED ({len(failed)} failing)")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
