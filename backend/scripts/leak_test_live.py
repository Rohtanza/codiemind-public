#!/usr/bin/env python3
"""Live end-to-end session-isolation leak test.

The hermetic regression form lives in `backend/tests/test_session_isolation.py`
and is what CI runs. This script is the original: it drives a running server
with a real provider, and is kept because it is the artifact that first
demonstrated the leak on 2026-09-05 against commit ef1e3b6.

"Retrieval disabled" is operationalised as wiping the preference store (SQLite
row + Chroma vector, via /memory/forget) after session 1, leaving the
conversations table intact. There is no retrieval-disable flag in the codebase.

Usage:
    HISTORY_ENABLED=true CODIEMIND_DATA_DIR=/tmp/leak \
        uv run uvicorn app.main:app --port 8123 &
    uv run python scripts/leak_test_live.py /tmp/leak evidence.json

Exit code 1 == leak present. Before the session_id fix this exited 1.
"""
from __future__ import annotations

import json
import sqlite3
import sys
import urllib.request

BASE = "http://127.0.0.1:8123"
MARKER = "zqx_"
PREFERENCE = "Always prefix every helper function name with `zqx_`, for example `zqx_formatDate`."
S1_SESSION = "leak-session-1"
S2_SESSION = "leak-session-2"


def call(method: str, path: str, body: dict | None = None) -> dict:
    req = urllib.request.Request(
        BASE + path,
        method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.loads(r.read() or b"null")


def conversation_rows(data_dir: str) -> int:
    con = sqlite3.connect(f"file:{data_dir}/memory.db?mode=ro", uri=True)
    n = con.execute("select count(*) from conversations").fetchone()[0]
    con.close()
    return n


def chroma_preference_vectors(data_dir: str) -> int:
    con = sqlite3.connect(f"file:{data_dir}/chroma/chroma.sqlite3?mode=ro", uri=True)
    row = con.execute("select id from collections where name='preferences'").fetchone()
    if not row:
        con.close()
        return 0
    n = con.execute(
        "select count(*) from embeddings e join segments s on e.segment_id = s.id "
        "where s.collection = ?",
        (row[0],),
    ).fetchone()[0]
    con.close()
    return n


def main(data_dir: str, evidence_path: str) -> int:
    print("=" * 72, "\nSESSION 1 - state the preference, then use it")
    pref_id = call(
        "POST",
        "/memory/remember",
        {"content": PREFERENCE, "category": "style", "scope_type": "project", "importance": 9},
    )["id"]
    print(f"  stored preference id={pref_id}")
    s1 = call(
        "POST",
        "/chat",
        {
            "query": "Write a TypeScript helper that trims whitespace from a string.",
            "session_id": S1_SESSION,
        },
    )
    print(f"  marker in s1 response: {MARKER in s1['text']}")
    print(f"  conversations={conversation_rows(data_dir)} "
          f"chroma_vectors={chroma_preference_vectors(data_dir)}")

    print("=" * 72, "\nWIPE - preference store only; conversations untouched")
    print("  forget ->", call("DELETE", f"/memory/forget/{pref_id}"))
    listing = call("GET", "/memory/list?scope=project")
    print(f"  /memory/list preferences={len(listing['preferences'])}")
    print(f"  chroma_vectors={chroma_preference_vectors(data_dir)} "
          f"conversations={conversation_rows(data_dir)} (must be unchanged)")
    assert not listing["preferences"] and chroma_preference_vectors(data_dir) == 0

    print("=" * 72, "\nSESSION 2 - different session id, retrieval disabled")
    s2 = call(
        "POST",
        "/chat",
        {
            "query": "Write a TypeScript helper that formats an ISO date string as DD/MM/YYYY.",
            "session_id": S2_SESSION,
        },
    )
    print(f"  applied_preference_ids={s2['applied_preference_ids']}")

    print("=" * 72, "\nASSERTION - preference text must NOT appear in the assembled prompt")
    ctx = call("GET", "/context/last")
    leaks = []
    for slot in ctx["slots"]:
        content = slot.get("content") or ""
        leaked = MARKER in content or PREFERENCE[:40] in content
        if leaked:
            leaks.append(slot["name"])
        print(f"  {slot['name']:34s} chars={len(content):5d} marker={leaked}")

    json.dump({"ctx": ctx, "s1": s1, "s2": s2, "leaks": leaks},
              open(evidence_path, "w"), indent=1)

    if leaks:
        print(f"\n  >>> LEAK TEST FAIL - preference reached slots: {leaks} <<<")
        for slot in ctx["slots"]:
            if slot["name"] in leaks:
                print(f"\n--- {slot['name']} ---\n{slot['content']}")
        return 1
    print("\n  >>> LEAK TEST PASS - no leak <<<")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "leak_evidence.json"))
