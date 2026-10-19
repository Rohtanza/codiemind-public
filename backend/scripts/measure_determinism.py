#!/usr/bin/env python3
"""Measure decoding determinism.

"Determinism is not assumed; it is measured. Run one case ten times at
temperature 0 and report the variance. If it is non-zero -- and with several
providers it will be -- say so, and run every condition at n repetitions with
the number stated."

One case, N repetitions, through the full /chat pipeline with history disabled
so the only source of variation is the provider. Reports byte-identical rate,
distinct-response count, and stability of system_fingerprint and token counts.

Usage:
    HISTORY_ENABLED=false CODIEMIND_DATA_DIR=/tmp/det \
        uv run uvicorn app.main:app --port 8124 &
    uv run python scripts/measure_determinism.py --case style-01 --n 10 \
        --out ../analysis/determinism_style-01.json
"""
from __future__ import annotations

import argparse
import hashlib
import json
import statistics
import sys
import urllib.request
from collections import Counter
from pathlib import Path

BASE = "http://127.0.0.1:8124"


def call(method: str, path: str, body: dict | None = None) -> dict:
    req = urllib.request.Request(
        BASE + path,
        method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.loads(r.read() or b"null")


def wipe() -> None:
    listing = call("GET", "/memory/list?scope=project")
    for item in listing["preferences"] + listing["decisions"]:
        call("DELETE", f"/memory/forget/{item['id']}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--case", default="style-01")
    ap.add_argument("--n", type=int, default=10)
    ap.add_argument("--cases", default=str(Path(__file__).parents[2] / "benchmark/cases/cases.json"))
    ap.add_argument("--out", default="determinism.json")
    args = ap.parse_args()

    cases = json.loads(Path(args.cases).read_text())
    case = next(c for c in cases if c["id"] == args.case)

    # Seed the store once; the same single preference is retrieved every trial.
    wipe()
    pref_id = call("POST", "/memory/remember", {
        "content": case["preference"]["content"],
        "category": case["preference"]["category"],
        "scope_type": "project",
        "importance": case["preference"]["importance"],
    })["id"]

    trials = []
    for i in range(args.n):
        body = call("POST", "/chat", {
            "query": case["query"],
            "session_id": f"determinism-{i}",   # each trial its own session
            "history_enabled": False,           # Slot 5 empty,
        })
        record = body.get("llm_call") or {}
        text = body["text"]
        trials.append({
            "i": i,
            "sha256": hashlib.sha256(text.encode()).hexdigest(),
            "chars": len(text),
            "text": text,
            "response_id": record.get("response_id"),
            "system_fingerprint": record.get("system_fingerprint"),
            "completion_tokens": record.get("completion_tokens"),
            "finish_reason": record.get("finish_reason"),
            "prompt_tokens": record.get("prompt_tokens"),
        })
        print(f"  trial {i + 1}/{args.n}  chars={len(text):5d}  "
              f"sha={trials[-1]['sha256'][:12]}  fp={trials[-1]['system_fingerprint']}")

    digests = Counter(t["sha256"] for t in trials)
    modal_count = digests.most_common(1)[0][1]
    lengths = [t["chars"] for t in trials]
    comp = [t["completion_tokens"] for t in trials if t["completion_tokens"] is not None]

    summary = {
        "case_id": case["id"],
        "query": case["query"],
        "preference": case["preference"]["content"],
        "n": args.n,
        "model": (trials[0].get("response_id") and None) or None,
        "llm_call_example": {k: v for k, v in trials[0].items()
                             if k in ("system_fingerprint", "finish_reason")},
        "distinct_responses": len(digests),
        "byte_identical_rate": round(modal_count / args.n, 4),
        "modal_response_count": modal_count,
        "response_chars_min": min(lengths),
        "response_chars_max": max(lengths),
        "response_chars_mean": round(statistics.mean(lengths), 2),
        "response_chars_stdev": round(statistics.pstdev(lengths), 4),
        "completion_tokens_distinct": sorted(set(comp)),
        "completion_tokens_stdev": round(statistics.pstdev(comp), 4) if comp else None,
        "system_fingerprints": sorted({str(t["system_fingerprint"]) for t in trials}),
        "finish_reasons": sorted({str(t["finish_reason"]) for t in trials}),
        "deterministic": len(digests) == 1,
    }

    call("DELETE", f"/memory/forget/{pref_id}")

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({"summary": summary, "trials": trials}, indent=2))

    print("\n" + "=" * 68)
    for k, v in summary.items():
        if k not in ("query", "preference", "llm_call_example", "model"):
            print(f"  {k:28s} {v}")
    print("=" * 68)
    print(f"  VERDICT: {'deterministic' if summary['deterministic'] else 'NON-DETERMINISTIC'} "
          f"at temperature 0 over n={args.n}")
    print(f"  written to {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
