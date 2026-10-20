#!/usr/bin/env python3
"""Stage 6 — run the frozen Stage 5 case set through the three arms and score it.

One run = one model behind one backend process. Every trial goes through POST /chat on the
CodieMind backend (codiemind/benchmark/conditions.py's single call path), so provider, model and
decoding are identical across arms. Each response is scored by the Stage 4 pipeline
([E] extract -> [G] gate -> [V] verifier): prose never reaches a verifier.

  arm A  none       no preference anywhere
  arm B  static     target + n-1 ballast concatenated into one rule file (target at the case's
                    pre-registered position), sent as `static_preferences`; store empty
  arm C  retrieval  target + n-1 ballast stored via /memory/remember; the scorer picks top-k

Simulated clock (one session = one day): before each arm-C trial the harness sets
`preferences.created_at/last_accessed_at` in the backend's SQLite store so the target is d days
old and ballast rank j is (j mod 30) days old. The scorer's constants are untouched.

Usage (real run, after the leak test passes — see out/RUNBOOK.md):
  python3 harness/run_benchmark.py --model-label gemini-2.5-flash-001 \
      --backend http://127.0.0.1:8000 --data-dir /path/to/.codiemind --out runs/gemini.jsonl
Dry run of the whole pipeline without any model (synthetic responses from fixture files; the
output is NOT a result and must never be copied to out/):
  python3 harness/run_benchmark.py --stub --out /tmp/stub.jsonl --limit 6 --sizes 10 120 --reps 1
Resumable: trials already present in --out are skipped.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import pathlib
import sqlite3
import sys
import time

STAGE = pathlib.Path(__file__).resolve().parent
ROOT = STAGE.parent
CASES = ROOT / "benchmark" / "cases.jsonl"
STORES = ROOT / "benchmark" / "stores.json"
VERIFIERS = ROOT / "verifiers"
sys.path.insert(0, str(VERIFIERS))
from registry import active  # noqa: E402
from runtime import score_response  # noqa: E402

STATIC_HEADER = "The following project rules apply to every response. Follow all of them.\n"
ARMS = ("A", "B", "C")
SIZES = (10, 30, 60, 120)
REPS = 3
BALLAST_AGE_CYCLE = 30
EPOCH = dt.datetime(2026, 1, 1)          # simulated "now" is irrelevant; only ages matter


def sha(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def trials(cases: list[dict], arms, sizes, reps):
    for c in cases:
        for rep in range(1, reps + 1):
            for arm in arms:
                for n in ([None] if arm == "A" else sizes):
                    yield c, arm, n, rep


def trial_key(model: str, c: dict, arm: str, n, rep: int) -> str:
    return f"{model}|{c['case_id']}|{arm}|{n}|{rep}"


def static_file(target: str, ballast: list[str], position: str) -> str:
    rules = list(ballast)
    at = {"start": 0, "middle": len(rules) // 2, "end": len(rules)}[position]
    rules.insert(at, target)
    return STATIC_HEADER + "\n".join(f"- {r}" for r in rules)


# ------------------------------------------------------------------ backend arms

class Backend:
    def __init__(self, url: str, data_dir: pathlib.Path) -> None:
        import httpx
        self.h, self.url = httpx, url.rstrip("/")
        self.db = data_dir / "memory.db"
        self.ballast_ids: dict[int, str] = {}      # rank -> preference id, for the resident store
        self.ballast_n = 0

    def _post(self, path: str, body: dict) -> dict:
        r = self.h.post(self.url + path, json=body, timeout=180)
        if r.status_code // 100 != 2:
            raise RuntimeError(f"{path}: HTTP {r.status_code} {r.text[:300]}")
        return r.json()

    def wipe(self) -> None:
        r = self.h.get(self.url + "/memory/list?scope=project", timeout=60)
        r.raise_for_status()
        d = r.json()
        for it in d.get("preferences", []) + d.get("decisions", []):
            self.h.delete(f"{self.url}/memory/forget/{it['id']}", timeout=60).raise_for_status()
        self.ballast_ids, self.ballast_n = {}, 0

    def remember(self, text: str) -> str:
        return self._post("/memory/remember", {"content": text, "category": "other",
                                                "scope_type": "project", "importance": 5})["id"]

    def ensure_ballast(self, ballast: list[dict], n: int) -> None:
        """Resident ballast ranks 1..n-1 (nested: growing the store only adds)."""
        if self.ballast_n > n - 1:
            self.wipe()
        for b in ballast[self.ballast_n:n - 1]:
            self.ballast_ids[b["ballast_rank"]] = self.remember(b["text"])
        self.ballast_n = n - 1

    def backdate(self, target_id: str, distance: int) -> None:
        con = sqlite3.connect(self.db)
        try:
            def stamp(days: int) -> str:
                return (EPOCH - dt.timedelta(days=days)).strftime("%Y-%m-%d %H:%M:%S.%f")
            # The scorer measures age from wall-clock now; shift everything so ages are exact.
            now = dt.datetime.now(dt.timezone.utc).replace(tzinfo=None)
            shift = now - EPOCH
            rows = [(stamp(r % BALLAST_AGE_CYCLE), i) for r, i in self.ballast_ids.items() if r <= self.ballast_n]
            rows.append((stamp(distance), target_id))
            for s, i in rows:
                t = (dt.datetime.strptime(s, "%Y-%m-%d %H:%M:%S.%f") + shift).strftime("%Y-%m-%d %H:%M:%S.%f")
                con.execute("UPDATE preferences SET created_at=?, last_accessed_at=? WHERE id=?", (t, t, i))
            con.commit()
        finally:
            con.close()

    def chat(self, query: str, session: str, static: str | None = None) -> dict:
        body = {"query": query, "session_id": session[:64], "history_enabled": False}
        if static is not None:
            body["static_preferences"] = static
        d = self._post("/chat", body)
        if not d.get("text", "").strip():
            raise RuntimeError("empty completion")
        return d


def prompt_text(d: dict) -> str:
    """The exact text sent to the provider (falls back to the joined slots)."""
    pb = d.get("prompt_breakdown") or {}
    return pb.get("prompt_text") or "\n".join(x.get("content", "") for x in pb.get("slots", []))


def access(d: dict, target: str) -> dict:
    """Access instrumentation: did the target text reach the prompt?
    `applied_preference_ids` is NOT used for this: the backend fills it with the ids the model
    *cites* in its reply, which measures citation, not retrieval."""
    p = prompt_text(d)
    return {"response": d["text"], "llm_call": d.get("llm_call"), "target_in_prompt": target in p,
            "prompt_sha256": sha(p), "cited_preference_ids": d.get("applied_preference_ids", [])}


def run_trial_backend(be: Backend, c: dict, arm: str, n, rep: int, ballast: list[dict]) -> dict:
    target = c["rule"]["text"]
    session = f"t{c['session_plan']['tested_at']}-{sha(c['case_id'] + arm + str(n) + str(rep))[:12]}"
    if arm == "A":
        if be.ballast_n:
            be.wipe()
        return access(be.chat(c["query"], session), target)
    if arm == "B":
        if be.ballast_n:
            be.wipe()
        static = static_file(target, [b["text"] for b in ballast[:n - 1]], c["arm_b_position"])
        return access(be.chat(c["query"], session, static=static), target)
    be.ensure_ballast(ballast, n)
    tid = be.remember(target)
    try:
        be.backdate(tid, c["session_plan"]["distance"])
        d = be.chat(c["query"], session)
    finally:
        be.h.delete(f"{be.url}/memory/forget/{tid}", timeout=60).raise_for_status()
    return {**access(d, target), "target_preference_id": tid}


# ------------------------------------------------------------------ stub (pipeline dry run)

def run_trial_stub(c: dict, arm: str, n, rep: int) -> dict:
    """Synthetic response: prose with the rule text (a banned-string trap) + one fixture file."""
    rid = c["rule"]["source_rule_id"]
    fx = json.loads((VERIFIERS / "fixtures" / rid / "fixtures.json").read_text(encoding="utf-8"))
    dev = {k: [f for f in fx["fixtures"] if f["set"] == "dev" and f["kind"] == k]
           for k in ("positive", "negative", "inapplicable")}
    u = int(sha(f"{c['case_id']}|{arm}|{n}|{rep}")[:8], 16) / 0xFFFFFFFF
    retrieved = arm == "B" or (arm == "C" and u < 0.9 - 0.02 * c["session_plan"]["distance"])
    p_sat = 0.4 if not retrieved else 0.75
    kind = "inapplicable" if not c["expects_construct"] else ("positive" if u < p_sat else "negative")
    f = dev[kind][int(u * 1000) % len(dev[kind])]
    src = (VERIFIERS / "fixtures" / rid / f["file"]).read_text(encoding="utf-8")
    tag = pathlib.Path(f["file"]).suffix.lstrip(".")
    text = f"Here is the code. Note the project rule: {c['rule']['text']}\n\n```{tag}\n{src}\n```\n"
    return {"response": text, "llm_call": {"model": "stub", "temperature": 0, "seed": 0, "max_tokens": 0},
            "target_in_prompt": retrieved, "prompt_sha256": None, "cited_preference_ids": [],
            "stub_fixture": f["id"]}


# ------------------------------------------------------------------ main

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model-label", default="stub")
    ap.add_argument("--backend", default="http://127.0.0.1:8000")
    ap.add_argument("--data-dir", type=pathlib.Path)
    ap.add_argument("--out", type=pathlib.Path, required=True)
    ap.add_argument("--arms", nargs="+", default=list(ARMS))
    ap.add_argument("--sizes", nargs="+", type=int, default=list(SIZES))
    ap.add_argument("--reps", type=int, default=REPS)
    ap.add_argument("--limit", type=int, default=0, help="first N cases only (dry runs)")
    ap.add_argument("--cases", nargs="+", default=[], help="only these case_ids (variance diagnostic)")
    ap.add_argument("--stub", action="store_true")
    a = ap.parse_args()
    if not a.stub and not a.data_dir:
        ap.error("--data-dir is required for a real run (the simulated clock edits its memory.db)")
    cases = [json.loads(line) for line in CASES.read_text(encoding="utf-8").splitlines() if line.strip()]
    if a.cases:
        missing = set(a.cases) - {c["case_id"] for c in cases}
        if missing:
            ap.error(f"unknown case ids: {sorted(missing)}")
        cases = [c for c in cases if c["case_id"] in set(a.cases)]
    if a.limit:
        cases = cases[:a.limit]
    ballast = json.loads(STORES.read_text(encoding="utf-8"))["ballast"]
    cases_sha = hashlib.sha256(CASES.read_bytes()).hexdigest()
    done = set()
    if a.out.exists():
        for line in a.out.read_text(encoding="utf-8").splitlines():
            if line.strip():
                done.add(json.loads(line)["trial_key"])
    be = None if a.stub else Backend(a.backend, a.data_dir)
    if be:
        be.wipe()
    cache: dict[tuple[str, str], dict] = {}     # verifiers are pure: same text, same verdict
    a.out.parent.mkdir(parents=True, exist_ok=True)
    n_new = 0
    with a.out.open("a", encoding="utf-8") as fout:
        # Order by store size so arm C grows the resident ballast instead of rebuilding it.
        order = sorted(trials(cases, a.arms, a.sizes, a.reps), key=lambda t: (t[2] or 0, t[1], t[0]["case_id"], t[3]))
        for c, arm, n, rep in order:
            key = trial_key(a.model_label, c, arm, n, rep)
            if key in done:
                continue
            t0 = time.time()
            r = run_trial_stub(c, arm, n, rep) if a.stub else run_trial_backend(be, c, arm, n, rep, ballast)
            rid = c["rule"]["source_rule_id"]
            entry = active(rid, "ts" if c["rule"]["language"] == "typescript" else "py")
            ck = (entry["verifier_id"], sha(r["response"]))
            if ck not in cache:
                v = score_response(r["response"], entry)
                cache[ck] = {"outcome": v.outcome, "detail": v.detail,
                             "evidence": [{"file": e.file, "line": e.line, "node_kind": e.node_kind}
                                          for u in v.unit_verdicts for e in u.evidence][:20]}
            rec = {"trial_key": key, "model_label": a.model_label, "stub": a.stub, "cases_sha256": cases_sha,
                   "case_id": c["case_id"], "rule_id": rid, "tier": c["rule"]["tier_implemented"],
                   "query_type": c["query_type"], "expects_construct": c["expects_construct"],
                   "arm": arm, "store_size": n, "distance": c["session_plan"]["distance"],
                   "position": c["arm_b_position"] if arm == "B" else None, "rep": rep,
                   "verifier_id": entry["verifier_id"], "verifier_sha256": entry["sha256"],
                   **cache[ck], "target_in_prompt": r["target_in_prompt"],
                   "prompt_sha256": r["prompt_sha256"], "cited_preference_ids": r["cited_preference_ids"],
                   "llm_call": r["llm_call"],
                   "response_sha256": sha(r["response"]), "response": r["response"],
                   "wall_seconds": round(time.time() - t0, 3),
                   **({"stub_fixture": r["stub_fixture"]} if "stub_fixture" in r else {})}
            fout.write(json.dumps(rec, ensure_ascii=False) + "\n")
            fout.flush()
            n_new += 1
    print(f"{n_new} new trials -> {a.out} ({len(done)} already present); {len(cache)} distinct verdicts computed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
