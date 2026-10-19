"""[E] Extraction.

Every fenced block whose language tag is in the target set is taken; untagged fences only when
the case declares a single expected language. Blocks of one language are concatenated, in order,
into one code unit. Nothing else is stripped, repaired or completed. No target block -> NO_CODE.
Prose outside fences never reaches a verifier: this is what closes the FYP-1 defect.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

# tag -> (language group, script kind). ts and js are separate units; tsx/jsx mark the unit's kind.
TAGS = {
    "ts": ("ts", "ts"), "typescript": ("ts", "ts"), "tsx": ("ts", "tsx"),
    "js": ("js", "js"), "javascript": ("js", "js"), "jsx": ("js", "jsx"),
    "py": ("py", "py"), "python": ("py", "py"),
}
DEFAULT_KIND = {"ts": "ts", "js": "js", "py": "py"}

# A fence opens with ``` or ~~~ (3+), optional info string; closes with the same char, >= length.
_OPEN = re.compile(r"^(?P<indent> {0,3})(?P<fence>`{3,}|~{3,})[ \t]*(?P<info>[^\n`]*)$")


@dataclass(frozen=True)
class Block:
    tag: str        # lower-cased first word of the info string, "" if untagged
    code: str
    start_line: int  # 1-based line of the first code line in the response


@dataclass(frozen=True)
class Unit:
    language: str    # ts | js | py
    kind: str        # ts | tsx | js | jsx | py
    code: str
    blocks: int


def fenced_blocks(response: str) -> list[Block]:
    lines = response.split("\n")
    out, i = [], 0
    while i < len(lines):
        m = _OPEN.match(lines[i])
        if not m:
            i += 1
            continue
        fence, info = m.group("fence"), m.group("info").strip()
        tag = info.split()[0].lower() if info else ""
        body, j = [], i + 1
        close = re.compile(r"^ {0,3}" + re.escape(fence[0]) + "{" + str(len(fence)) + r",}[ \t]*$")
        while j < len(lines) and not close.match(lines[j]):
            body.append(lines[j])
            j += 1
        out.append(Block(tag, "\n".join(body), i + 2))  # unterminated: runs to end, unrepaired
        i = j + 1
    return out


def extract(response: str, expected_language: str | None = None) -> list[Unit]:
    """Code units by language, in first-appearance order. [] means NO_CODE."""
    groups: dict[str, list[tuple[str, str]]] = {}
    for b in fenced_blocks(response):
        if b.tag in TAGS:
            lang, kind = TAGS[b.tag]
        elif b.tag == "" and expected_language in DEFAULT_KIND:
            lang, kind = expected_language, DEFAULT_KIND[expected_language]
        else:
            continue
        groups.setdefault(lang, []).append((kind, b.code))
    units = []
    for lang, parts in groups.items():
        kinds = {k for k, _ in parts}
        kind = ("tsx" if "tsx" in kinds else "ts") if lang == "ts" else \
               ("jsx" if "jsx" in kinds else "js") if lang == "js" else "py"
        units.append(Unit(lang, kind, "\n".join(c for _, c in parts), len(parts)))
    return units
