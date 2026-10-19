#!/usr/bin/env python3
"""Self-test of run_benchmark.Backend against the real CodieMind app, with no model and no key.

Starts the backend (uvicorn, temp data dir) with `get_llm_client` overridden by a fake whose
embedding is a deterministic bag-of-words vector and whose completion records the prompt it was
sent. Drives the three arms exactly as run_benchmark does, then checks what reached each prompt
and what the simulated clock wrote to SQLite. Run from codiemind/backend:

  uv run --frozen python ../harness/harness_selftest.py

Exit 0 = every check passed. Not a result; no model is involved.
"""
from __future__ import annotations

import datetime as dt
import hashlib
import json
import math
import os
import pathlib
import re
import socket
import sqlite3
import sys
import tempfile
import threading
import time

HERE = pathlib.Path(__file__).resolve().parent
TMP = pathlib.Path(tempfile.mkdtemp(prefix="cm-selftest-"))
os.environ["CODIEMIND_DATA_DIR"] = str(TMP)
os.environ.setdefault("GEMINI_API_KEY", "selftest-unused")
sys.path.insert(0, str(HERE))
sys.path.insert(0, os.getcwd())

import run_benchmark as rb  # noqa: E402
import uvicorn  # noqa: E402
from app import config  # noqa: E402
from app.main import app  # noqa: E402
from app.llm_client import get_llm_client  # noqa: E402

PROMPTS: list[str] = []


class FakeLLM:
    chat_model = "fake-selftest"
    embedding_model = "fake-bow"

    async def generate_embedding(self, text: str) -> list[float]:
        v = [0.0] * 256
        for w in re.findall(r"[a-z]+", text.lower()):
            v[int(hashlib.md5(w.encode()).hexdigest(), 16) % 256] += 1.0
        n = math.sqrt(sum(x * x for x in v)) or 1.0
        return [x / n for x in v]

    async def chat_completion(self, *args, **kwargs) -> str:
        PROMPTS.append(json.dumps([args, kwargs], default=str))
        return "Done.\n\n```ts\nexport const answer = 42;\n```\n"

    def __getattr__(self, name):          # any provenance accessor the service may call
        return None


def free_port() -> int:
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    p = s.getsockname()[1]
    s.close()
    return p


def main() -> int:
    assert config.settings.codiemind_data_dir == TMP, config.settings.codiemind_data_dir
    app.dependency_overrides[get_llm_client] = lambda: FakeLLM()
    port = free_port()
    server = uvicorn.Server(uvicorn.Config(app, host="127.0.0.1", port=port, log_level="warning"))
    threading.Thread(target=server.run, daemon=True).start()
    for _ in range(100):
        if server.started:
            break
        time.sleep(0.1)
    fails: list[str] = []

    def check(name: str, ok: bool, detail: str = "") -> None:
        print(("PASS " if ok else "FAIL ") + name + (f"  ({detail})" if detail and not ok else ""))
        if not ok:
            fails.append(name)

    cases = [json.loads(x) for x in rb.CASES.read_text(encoding="utf-8").splitlines() if x.strip()]
    ballast = json.loads(rb.STORES.read_text(encoding="utf-8"))["ballast"]
    be = rb.Backend(f"http://127.0.0.1:{port}", TMP)
    be.wipe()
    c = next(x for x in cases if x["session_plan"]["distance"] == 5 and x["arm_b_position"] == "end")
    target = c["rule"]["text"]

    PROMPTS.clear()
    r = rb.run_trial_backend(be, c, "A", None, 1, ballast)
    check("arm A: completion returned", "answer = 42" in r["response"])
    check("arm A: access flag false", r["target_in_prompt"] is False)
    check("arm A: target absent from prompt", PROMPTS and target[:40] not in PROMPTS[-1])
    check("arm A: no ballast in prompt", PROMPTS and ballast[0]["text"][:40] not in PROMPTS[-1])

    PROMPTS.clear()
    r = rb.run_trial_backend(be, c, "B", 10, 1, ballast)
    p = PROMPTS[-1] if PROMPTS else ""
    check("arm B: target in prompt", target[:40] in p)
    check("arm B: access flag true", r["target_in_prompt"] is True)
    check("arm B: all 9 ballast rules in prompt", all(b["text"][:30] in p for b in ballast[:9]))
    check("arm B: ballast rank 10 absent", ballast[9]["text"][:30] not in p)
    check("arm B: target after last ballast (position=end)",
          p.find(target[:40]) > p.find(ballast[8]["text"][:30]) >= 0)
    sf = rb.static_file("T", ["a", "b", "c", "d"], "middle")
    check("static_file middle position", sf.splitlines()[1:] == ["- a", "- b", "- T", "- c", "- d"])

    PROMPTS.clear()
    r = rb.run_trial_backend(be, c, "C", 30, 1, ballast)
    lst = be.h.get(be.url + "/memory/list?scope=project").json()["preferences"]
    check("arm C: target forgotten after trial; 29 ballast resident", len(lst) == 29, str(len(lst)))
    check("arm C: target_in_prompt agrees with prompt text",
          r["target_in_prompt"] == (target[:40] in (PROMPTS[-1] if PROMPTS else "")))
    check("arm C: cited ids recorded separately from access", isinstance(r["cited_preference_ids"], list))

    # Simulated clock: re-run the backdate on a fresh target and read SQLite directly.
    tid = be.remember(target)
    be.backdate(tid, 5)
    con = sqlite3.connect(TMP / "memory.db")
    now = dt.datetime.now(dt.timezone.utc).replace(tzinfo=None)

    def age(i):
        s = con.execute("SELECT last_accessed_at FROM preferences WHERE id=?", (i,)).fetchone()[0]
        return (now - dt.datetime.fromisoformat(s)).total_seconds() / 86400

    check("clock: target is 5 days old", abs(age(tid) - 5) < 0.01, f"{age(tid):.4f}")
    check("clock: ballast rank 7 is 7 days old", abs(age(be.ballast_ids[7]) - 7) < 0.01)
    check("clock: ballast rank 30 is 0 days old", 30 not in be.ballast_ids or abs(age(be.ballast_ids[30])) < 0.01)
    check("clock: ballast rank 29 is 29 days old", abs(age(be.ballast_ids[29]) - 29) < 0.01)
    con.close()
    be.h.delete(f"{be.url}/memory/forget/{tid}")

    # Growing then shrinking the store: nested growth adds, shrink rebuilds.
    be.ensure_ballast(ballast, 60)
    n60 = len(be.h.get(be.url + "/memory/list?scope=project").json()["preferences"])
    be.ensure_ballast(ballast, 10)
    n10 = len(be.h.get(be.url + "/memory/list?scope=project").json()["preferences"])
    check("store grows to 59 and rebuilds down to 9", (n60, n10) == (59, 9), f"{n60},{n10}")

    server.should_exit = True
    print(f"{len(fails)} failed")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
