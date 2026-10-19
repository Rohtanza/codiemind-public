#!/usr/bin/env python3
"""Run every registered verifier on its fixtures.

For each fixture: gate it (a MALFORMED fixture is a FIXTURE_ERROR, never a verdict), run the
active verifier, compare with `expected`. For each adversarial fixture with a `lower_check`,
also execute the lower tier's check (T1: Python regex, re.search with re.MULTILINE; T2: a tsquery
selector on the single file, run by the bridge): a match gives `match_means`, no match the
opposite, and the fixture DEFEATS the lower tier when that verdict differs from `expected`.

  python3 eval_fixtures.py [--rule R ...] [--sets dev,heldout] [--out CSV]
  python3 eval_fixtures.py --module DRAFT --tier T2 --fixdir DIR      (draft, unregistered)
Exit status 1 if any verifier is wrong on any fixture it was run on.
"""
from __future__ import annotations

import argparse
import csv
import json
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from contract import ContractError  # noqa: E402
from extract import Unit  # noqa: E402
from registry import active, load  # noqa: E402
from runtime import bridge, gate, run_units  # noqa: E402

FIX = HERE / "fixtures"
KIND = {".ts": ("ts", "ts"), ".tsx": ("ts", "tsx"), ".js": ("js", "js"), ".jsx": ("js", "jsx"),
        ".py": ("py", "py")}
OPP = {"SATISFIED": "VIOLATED", "VIOLATED": "SATISFIED"}
FIELDS = ["rule_id", "verifier_id", "fixture", "set", "kind", "expected", "got", "correct",
          "lower_tier", "lower_verdict", "lower_status", "evidence_n", "detail"]


def unit_of(path: pathlib.Path) -> Unit:
    lang, kind = KIND[path.suffix]
    return Unit(lang, kind, path.read_text(encoding="utf-8"), 1)


def lower(check: dict, u: Unit, expected: str) -> tuple[str, str]:
    if check["check_tier"] == "T1":
        hit = re.search(check["check"], u.code, re.MULTILINE) is not None
    elif check["check_tier"] == "T2":
        r = bridge([{"op": "tsquery", "selector": check["check"], "code": u.code, "kind": u.kind}])[0]
        if not r.get("ok"):
            return "", f"ERROR: {r.get('error')}"
        hit = r["count"] > 0
    else:
        return "", f"ERROR: no runner for {check['check_tier']}"
    verdict = check["match_means"] if hit else OPP[check["match_means"]]
    return verdict, "DEFEATS" if verdict != expected else "HOLDS"


def eval_rule(rule: str, sets: set[str], fixdir: pathlib.Path | None = None,
              entry: dict | None = None) -> list[dict]:
    base = fixdir or FIX / rule
    man = json.loads((base / "fixtures.json").read_text(encoding="utf-8"))
    entry = entry or active(rule, man["target"])
    if entry is None:
        return [{"rule_id": rule, "verifier_id": "", "fixture": "*", "detail": "no active verifier"}]
    rows = []
    for f in man["fixtures"]:
        if f["set"] not in sets:
            continue
        u = unit_of(base / f["file"])
        row = {"rule_id": rule, "verifier_id": entry["verifier_id"], "fixture": f["id"],
               "set": f["set"], "kind": f["kind"], "expected": f["expected"]}
        _, malformed, detail = gate([u])[0]
        if malformed:
            row.update(got="FIXTURE_ERROR", correct=False, detail=f"MALFORMED: {detail}")
        else:
            try:
                v = run_units(entry, [u])[0]
                row.update(got=v.outcome, correct=v.outcome == f["expected"],
                           evidence_n=len(v.evidence))
            except ContractError as e:
                row.update(got="CONTRACT_ERROR", correct=False, detail=str(e)[:300])
        if f.get("lower_check"):
            lv, st = lower(f["lower_check"], u, f["expected"])
            row.update(lower_tier=f["lower_check"]["check_tier"], lower_verdict=lv, lower_status=st)
        rows.append(row)
    return rows


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--rule", nargs="*")
    ap.add_argument("--sets", default="dev,heldout")
    ap.add_argument("--out")
    ap.add_argument("--module", help="draft mode: an unregistered verifier file")
    ap.add_argument("--tier", choices=["T1", "T2", "T3"])
    ap.add_argument("--fixdir", help="draft mode: a directory holding fixtures.json")
    a = ap.parse_args()
    rows = []
    if a.module:
        if not (a.tier and a.fixdir):
            raise SystemExit("--module needs --tier and --fixdir")
        fixdir = pathlib.Path(a.fixdir).resolve()
        man = json.loads((fixdir / "fixtures.json").read_text(encoding="utf-8"))
        entry = {"path": str(pathlib.Path(a.module).resolve()), "tier": a.tier,
                 "verifier_id": "draft", "target": man["target"]}
        rows = eval_rule(man["rule_id"], set(a.sets.split(",")), fixdir, entry)
    else:
        for r in a.rule or sorted({e["rule_id"] for e in load()["verifiers"].values()}):
            rows += eval_rule(r, set(a.sets.split(",")))
    wrong = [r for r in rows if r.get("correct") is not True]
    for r in rows:
        mark = "ok " if r.get("correct") is True else "XX "
        lo = f"  lower {r['lower_tier']}->{r['lower_verdict']} {r['lower_status']}" if r.get("lower_tier") else ""
        print(f"{mark}{r['rule_id']:<16}{r['fixture']:<8}{r.get('set',''):<8}exp {r.get('expected',''):<15}"
              f"got {r.get('got',''):<15}{lo} {r.get('detail','')}")
    print(f"\n{len(rows)} fixture runs, {len(wrong)} wrong")
    if a.out:
        with open(a.out, "w", encoding="utf-8", newline="") as fh:
            w = csv.DictWriter(fh, fieldnames=FIELDS, lineterminator="\n", extrasaction="ignore")
            w.writeheader()
            w.writerows(rows)
    return 1 if wrong else 0


if __name__ == "__main__":
    sys.exit(main())
