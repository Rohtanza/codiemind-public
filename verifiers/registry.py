#!/usr/bin/env python3
"""Versioned verifier registry (layout, §6 "no silent fixes").

registry.json maps verifier_id -> entry. verifier_id = "<rule_id>:<target>:<tier>:v<N>".
A verifier file is immutable once registered: its sha256 is recorded, and `check` fails if the
file changed. A changed verifier is a NEW file (…v<N+1>.js) registered as a new version; the
old entry stays, marked superseded, so results generated with it remain traceable.

  register PATH --rule R --target ts|py --tier T1|T2|T3 --origin s2|reference
  check                     every entry's file exists and matches its sha256
  export --out DIR          DIR/registry.json and DIR/mapping.csv (replication package)
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
REG = HERE / "registry.json"
NAME = re.compile(r"^(?P<rule>[A-Za-z0-9_]+)\.(?P<target>ts|py)\.v(?P<v>\d+)\.(js|py)$")
TIER_DIR = {"T1": "t1_lexical", "T2": "t2_syntactic", "T3": "t3_semantic"}


def load() -> dict:
    return json.loads(REG.read_text(encoding="utf-8")) if REG.exists() else {"verifiers": {}}


def save(reg: dict) -> None:
    REG.write_text(json.dumps(reg, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def sha(p: pathlib.Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def active(rule: str, target: str, reg: dict | None = None) -> dict | None:
    """The current (non-superseded) entry for a rule-target pair, any tier."""
    reg = reg or load()
    hits = [e for e in reg["verifiers"].values()
            if e["rule_id"] == rule and e["target"] == target and not e.get("superseded_by")]
    if len(hits) > 1:
        raise SystemExit(f"{rule}:{target} has {len(hits)} active entries")
    return hits[0] if hits else None


def register(path: str, rule: str, target: str, tier: str, origin: str) -> dict:
    p = pathlib.Path(path).resolve()
    rel = p.relative_to(HERE).as_posix()
    m = NAME.match(p.name)
    if not m or m["rule"] != rule or m["target"] != target:
        raise SystemExit(f"{p.name}: expected {rule}.{target}.v<N>.(js|py)")
    if not rel.startswith(("reference/", TIER_DIR[tier] + "/")):
        raise SystemExit(f"{rel}: a {tier} verifier lives in {TIER_DIR[tier]}/ or reference/")
    reg = load()
    vid = f"{rule}:{target}:{tier}:v{m['v']}"
    if vid in reg["verifiers"]:
        raise SystemExit(f"{vid} already registered (files are immutable; write v{int(m['v'])+1})")
    prev = active(rule, target, reg)
    entry = {"verifier_id": vid, "rule_id": rule, "target": target, "tier": tier,
             "version": int(m["v"]), "path": rel, "sha256": sha(p), "origin": origin}
    if prev:
        if prev["version"] >= entry["version"]:
            raise SystemExit(f"version must exceed active v{prev['version']}")
        reg["verifiers"][prev["verifier_id"]]["superseded_by"] = vid
    reg["verifiers"][vid] = entry
    reg["registry_version"] = reg.get("registry_version", 0) + 1
    save(reg)
    return entry


def check() -> list[str]:
    errs = []
    for vid, e in load()["verifiers"].items():
        p = HERE / e["path"]
        if not p.exists():
            errs.append(f"{vid}: file missing")
        elif sha(p) != e["sha256"]:
            errs.append(f"{vid}: file changed after registration (silent fix)")
    return errs


def export(out: pathlib.Path) -> None:
    errs = check()
    if errs:
        raise SystemExit("refusing to export:\n  " + "\n  ".join(errs))
    out.mkdir(parents=True, exist_ok=True)
    reg = load()
    (out / "registry.json").write_text(json.dumps(reg, indent=2, sort_keys=True) + "\n",
                                       encoding="utf-8")
    rows = sorted(reg["verifiers"].values(), key=lambda e: e["verifier_id"])
    with (out / "mapping.csv").open("w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=["verifier_id", "rule_id", "target", "tier", "version",
                                           "origin", "path", "sha256", "superseded_by"],
                           lineterminator="\n", extrasaction="ignore")
        w.writeheader()
        for e in rows:
            w.writerow({**e, "superseded_by": e.get("superseded_by", "")})


def main() -> int:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("register")
    r.add_argument("path")
    r.add_argument("--rule", required=True)
    r.add_argument("--target", required=True, choices=["ts", "py"])
    r.add_argument("--tier", required=True, choices=list(TIER_DIR))
    r.add_argument("--origin", required=True, choices=["s2", "reference"])
    sub.add_parser("check")
    x = sub.add_parser("export")
    x.add_argument("--out", required=True)
    a = ap.parse_args()
    if a.cmd == "register":
        print(json.dumps(register(a.path, a.rule, a.target, a.tier, a.origin), indent=2))
    elif a.cmd == "check":
        errs = check()
        print("\n".join(errs) if errs else f"OK — {len(load()['verifiers'])} entries match")
        return 1 if errs else 0
    else:
        export(pathlib.Path(a.out))
        print(f"exported -> {a.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
