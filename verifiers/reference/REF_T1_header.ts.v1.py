"""Reference T1 (METHODOLOGY_1 §2 example): every file starts with the licence header
`// SPDX-License-Identifier: MIT` on its first line. A property of the character stream at a
fixed position, so a regex is sound. An empty unit has no file to govern: NOT_APPLICABLE."""
import re

TIER = "T1"
HEADER = re.compile(r"\A// SPDX-License-Identifier: MIT[ \t]*(\r?\n|\Z)")


def verify(ctx):
    text = ctx["text"]
    if not text.strip():
        return {"outcome": "NOT_APPLICABLE", "evidence": []}
    first = text.split("\n", 1)[0]
    ok = HEADER.match(text) is not None
    return {"outcome": "SATISFIED" if ok else "VIOLATED",
            "evidence": [{"line": 1, "column": 1, "node_kind": "line", "text": first}]}
