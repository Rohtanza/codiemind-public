#!/usr/bin/env python3
"""Validate one rule's fixture set before any verifier sees it (item 6).

Checks, each able to fail:
  manifest     fixtures.json parses; rule_id/target/tier match the S2 target table; ids unique
  counts       dev: >= 3 positive, >= 3 negative, >= 1 inapplicable, >= 1 adversarial
               heldout: >= 2 positive, >= 2 negative, >= 1 adversarial
  kinds        positive -> SATISFIED, negative -> VIOLATED, inapplicable -> NOT_APPLICABLE,
               adversarial -> SATISFIED or VIOLATED
  files        every file exists, has the target's extension, and passes the gate (parses)
  lower check  T2/T3 rule: every adversarial fixture carries a lower_check at the tier below
               (T1 regex for T2, T2 tsquery selector for T3) and, EXECUTED, it DEFEATS
               T1 rule: no tier below; adversarial fixtures need no lower_check
Usage: python3 check_fixtures.py RULE_ID        exit 0 = valid
"""
from __future__ import annotations

import csv
import json
import pathlib
import sys
from collections import Counter

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from eval_fixtures import FIX, lower, unit_of  # noqa: E402
from runtime import gate  # noqa: E402

TARGETS = HERE.parent.parent / "data" / "s2_targets.csv"
EXTS = {"ts": {".ts", ".tsx", ".js", ".jsx"}, "py": {".py"}}
WANT = {"positive": {"SATISFIED"}, "negative": {"VIOLATED"}, "inapplicable": {"NOT_APPLICABLE"},
        "adversarial": {"SATISFIED", "VIOLATED"}}
MIN = {"dev": {"positive": 3, "negative": 3, "inapplicable": 1, "adversarial": 1},
       "heldout": {"positive": 2, "negative": 2, "adversarial": 1}}
BELOW = {"T2": "T1", "T3": "T2"}


def check(rule: str) -> list[str]:
    errs = []
    d = FIX / rule
    try:
        man = json.loads((d / "fixtures.json").read_text(encoding="utf-8"))
    except Exception as e:  # noqa: BLE001
        return [f"fixtures.json unreadable: {e}"]
    with TARGETS.open(encoding="utf-8", newline="") as fh:
        tgt = {r["rule_id"]: r for r in csv.DictReader(fh)}
    t = tgt.get(rule)
    if t is None:
        return [f"{rule} is not an S2 rule"]
    if man.get("rule_id") != rule or man.get("target") != t["target"] or man.get("tier") != t["tier"]:
        errs.append(f"manifest header must be rule_id={rule}, target={t['target']}, tier={t['tier']}")
    fx = man.get("fixtures", [])
    ids = [f.get("id") for f in fx]
    if len(ids) != len(set(ids)):
        errs.append("duplicate fixture ids")
    cnt = Counter((f.get("set"), f.get("kind")) for f in fx)
    for st, need in MIN.items():
        for k, n in need.items():
            if cnt[(st, k)] < n:
                errs.append(f"{st}: {cnt[(st, k)]} {k}, need >= {n}")
    for f in fx:
        tag = f"{f.get('id')}"
        if f.get("set") not in MIN:
            errs.append(f"{tag}: set must be dev or heldout")
        if f.get("kind") not in WANT or f.get("expected") not in WANT.get(f.get("kind"), ()):
            errs.append(f"{tag}: kind {f.get('kind')} cannot have expected {f.get('expected')}")
            continue
        p = d / f.get("file", "")
        if not p.is_file():
            errs.append(f"{tag}: file {f.get('file')} missing")
            continue
        if p.suffix not in EXTS[t["target"]]:
            errs.append(f"{tag}: extension {p.suffix} not allowed for target {t['target']}")
            continue
        u = unit_of(p)
        _, malformed, detail = gate([u])[0]
        if malformed:
            errs.append(f"{tag}: does not parse ({detail})")
            continue
        if f["kind"] == "adversarial" and t["tier"] in BELOW:
            lc = f.get("lower_check")
            if not lc or lc.get("check_tier") != BELOW[t["tier"]]:
                errs.append(f"{tag}: needs lower_check with check_tier {BELOW[t['tier']]}")
                continue
            if lc.get("match_means") not in ("SATISFIED", "VIOLATED") or not lc.get("check"):
                errs.append(f"{tag}: lower_check needs check and match_means")
                continue
            if t["tier"] == "T3" and u.language == "py":
                errs.append(f"{tag}: no T2 runner for python lower checks")
                continue
            try:
                verdict, status = lower(lc, u, f["expected"])
            except Exception as e:  # noqa: BLE001
                errs.append(f"{tag}: lower_check failed to run: {e}")
                continue
            if status != "DEFEATS":
                errs.append(f"{tag}: lower check gives {verdict or status}, same as expected — "
                            f"does not defeat {lc['check_tier']}")
    return errs


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 2
    errs = check(sys.argv[1])
    print("\n".join(errs) if errs else f"VALID — {sys.argv[1]}")
    return 1 if errs else 0


if __name__ == "__main__":
    sys.exit(main())
