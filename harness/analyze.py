#!/usr/bin/env python3
"""Stage 6 — every results table, generated from run records only.

Metrics: adherence = S/(S+V); applicability = (S+V)/(S+V+NA);
NO_CODE and MALFORMED rates over all trials (never in a denominator above); retrieval rate and
compliance-given-retrieval (arm C); adherence by tier. Every trial counts (no majority vote).
95% CIs: cluster bootstrap over rules, 10,000 resamples, seed 20261020.
H1 arm C, adherence d=1 minus d=20 > 0.  H2 T2 minus T3 > 0 (T1 n=1, descriptive).
H3 C minus B per store size; equivalent if the CI lies within ±5 pp.  H4 arm B start minus end, same margin.

Usage: python3 code/analyze.py RUNS.jsonl [RUNS2.jsonl ...] --outdir out/
Refuses stub records unless --allow-stub (dry runs write to a scratch dir, never out/).
"""
from __future__ import annotations

import argparse
import json
import pathlib
import random
import sys
from collections import defaultdict

SEED, B, MARGIN = 20261020, 10_000, 0.05
SCORED = ("SATISFIED", "VIOLATED")


def load(paths: list[pathlib.Path], allow_stub: bool) -> list[dict]:
    rs = []
    for p in paths:
        for line in p.read_text(encoding="utf-8").splitlines():
            if line.strip():
                rs.append(json.loads(line))
    if any(r.get("stub") for r in rs) and not allow_stub:
        raise SystemExit("stub records present: these are pipeline dry runs, not results (--allow-stub)")
    shas = {r["cases_sha256"] for r in rs}
    if len(shas) != 1:
        raise SystemExit(f"run records come from {len(shas)} different case sets")
    return rs


def by_rule(rs, pred):
    """rule -> [S, V, NA] over trials matching pred."""
    d = defaultdict(lambda: [0, 0, 0])
    for r in rs:
        if pred(r):
            o = r["outcome"]
            if o in ("SATISFIED", "VIOLATED", "NOT_APPLICABLE"):
                d[r["rule_id"]][("SATISFIED", "VIOLATED", "NOT_APPLICABLE").index(o)] += 1
    return d


def adh(cells) -> float | None:
    s = sum(c[0] for c in cells)
    v = sum(c[1] for c in cells)
    return s / (s + v) if s + v else None


def boot_diff(g1: dict, g2: dict | None, rng: random.Random):
    """Point estimate and 95% CI of adh(g1) - adh(g2) (or adh(g1) if g2 is None),
    resampling rules (the cluster) with replacement; groups resampled independently
    unless they share the same rule set, in which case they are resampled jointly (paired)."""
    def est(a, b):
        x = adh(a)
        if g2 is None:
            return x
        y = adh(b)
        return None if x is None or y is None else x - y
    point = est(list(g1.values()), list(g2.values()) if g2 is not None else None)
    if point is None:
        return None, None, None
    paired = g2 is not None and set(g1) == set(g2)
    k1 = sorted(g1)
    k2 = sorted(g2) if g2 is not None else []
    vals = []
    for _ in range(B):
        s1 = [rng.choice(k1) for _ in k1]
        s2 = s1 if paired else [rng.choice(k2) for _ in k2]
        e = est([g1[k] for k in s1], [g2[k] for k in s2] if g2 is not None else None)
        if e is not None:
            vals.append(e)
    vals.sort()
    return point, vals[int(0.025 * len(vals))], vals[int(0.975 * len(vals)) - 1]


def pct(x) -> str:
    return "—" if x is None else f"{100 * x:.1f}%"


def ci(t) -> str:
    p, lo, hi = t
    return "—" if p is None else f"{100 * p:+.1f} pp [{100 * lo:+.1f}, {100 * hi:+.1f}]"


def verdict_directional(t) -> str:
    p, lo, hi = t
    if p is None:
        return "not testable"
    return "supported" if lo > 0 else ("opposite direction" if hi < 0 else "not supported (CI includes 0)")


def verdict_equiv(t) -> str:
    p, lo, hi = t
    if p is None:
        return "not testable"
    if -MARGIN <= lo and hi <= MARGIN:
        return f"null holds (equivalent within ±{100 * MARGIN:.0f} pp)"
    if lo > 0 or hi < 0:
        return "difference (null rejected)"
    return "inconclusive (CI crosses the margin)"


def analyse(rs: list[dict], label: str, rng: random.Random) -> tuple[list[str], dict]:
    L, J = [f"## {label}", ""], {}
    sizes = sorted({r["store_size"] for r in rs if r["store_size"]})
    L += ["### Metrics by arm and store size", "",
          "| arm | store | trials | adherence | applicability | NO_CODE | MALFORMED | retrieval | compliance given retrieval |",
          "|---|---:|---:|---:|---:|---:|---:|---:|---:|"]
    for arm in ("A", "B", "C"):
        for n in ([None] if arm == "A" else sizes):
            sub = [r for r in rs if r["arm"] == arm and r["store_size"] == n]
            if not sub:
                continue
            cnt = defaultdict(int)
            for r in sub:
                cnt[r["outcome"]] += 1
            s, v, na = cnt["SATISFIED"], cnt["VIOLATED"], cnt["NOT_APPLICABLE"]
            ret = [r for r in sub if r["target_in_prompt"]] if arm == "C" else []
            cgr = adh(list(by_rule(ret, lambda r: True).values())) if arm == "C" else None
            row = {"trials": len(sub), "adherence": s / (s + v) if s + v else None,
                   "applicability": (s + v) / (s + v + na) if s + v + na else None,
                   "no_code": cnt["NO_CODE"] / len(sub), "malformed": cnt["MALFORMED"] / len(sub),
                   "retrieval": len(ret) / len(sub) if arm == "C" else None, "compliance_given_retrieval": cgr}
            J[f"{arm}|{n}"] = row
            L.append(f"| {arm} | {n or '—'} | {len(sub)} | {pct(row['adherence'])} | {pct(row['applicability'])} | "
                     f"{pct(row['no_code'])} | {pct(row['malformed'])} | {pct(row['retrieval'])} | {pct(cgr)} |")
    L += ["", "### Adherence by tier (arm C, all store sizes)", "", "| tier | rules | adherence [95% CI] |", "|---|---:|---:|"]
    for t in ("T1", "T2", "T3"):
        g = by_rule(rs, lambda r, t=t: r["arm"] == "C" and r["tier"] == t)
        if g:
            p, lo, hi = boot_diff(g, None, rng)
            L.append(f"| {t} | {len(g)} | {pct(p)} [{pct(lo)}, {pct(hi)}] |" if p is not None else f"| {t} | {len(g)} | — |")

    H = {}
    g1 = by_rule(rs, lambda r: r["arm"] == "C" and r["distance"] == 1)
    g20 = by_rule(rs, lambda r: r["arm"] == "C" and r["distance"] == 20)
    H["H1"] = boot_diff(g1, g20, rng)
    d_line = ", ".join(f"d={d} {pct(adh(list(by_rule(rs, lambda r, d=d: r['arm'] == 'C' and r['distance'] == d).values())))}"
                       for d in (1, 5, 20))
    gt2 = by_rule(rs, lambda r: r["arm"] == "C" and r["tier"] == "T2")
    gt3 = by_rule(rs, lambda r: r["arm"] == "C" and r["tier"] == "T3")
    H["H2"] = boot_diff(gt2, gt3, rng)
    L += ["", "### Pre-registered hypotheses", "", "| hypothesis | estimate [95% CI] | verdict |", "|---|---|---|",
          f"| H1 arm C adherence, d=1 − d=20 ({d_line}) | {ci(H['H1'])} | {verdict_directional(H['H1'])} |",
          f"| H2 arm C adherence, T2 − T3 | {ci(H['H2'])} | {verdict_directional(H['H2'])} |"]
    for n in sizes:
        gc = by_rule(rs, lambda r, n=n: r["arm"] == "C" and r["store_size"] == n)
        gb = by_rule(rs, lambda r, n=n: r["arm"] == "B" and r["store_size"] == n)
        H[f"H3@{n}"] = boot_diff(gc, gb, rng)
        L.append(f"| H3 C − B at store {n} (null predicted) | {ci(H[f'H3@{n}'])} | {verdict_equiv(H[f'H3@{n}'])} |")
    gs = by_rule(rs, lambda r: r["arm"] == "B" and r["position"] == "start")
    ge = by_rule(rs, lambda r: r["arm"] == "B" and r["position"] == "end")
    H["H4"] = boot_diff(gs, ge, rng)
    L.append(f"| H4 arm B, target at start − end (null predicted) | {ci(H['H4'])} | {verdict_equiv(H['H4'])} |")
    J["hypotheses"] = {k: {"estimate": v[0], "ci95": [v[1], v[2]]} for k, v in H.items()}
    return L + [""], J


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("runs", nargs="+", type=pathlib.Path)
    ap.add_argument("--outdir", type=pathlib.Path, required=True)
    ap.add_argument("--allow-stub", action="store_true")
    a = ap.parse_args()
    rs = load(a.runs, a.allow_stub)
    rng = random.Random(SEED)
    models = sorted({r["model_label"] for r in rs})
    head = ["# Stage 6 — results", "",
            f"Generated by `code/analyze.py` from {len(rs)} trial records in "
            + ", ".join(f"`{p.name}`" for p in a.runs) + f"; case set sha256 `{rs[0]['cases_sha256']}`. "
            "Adherence = S/(S+V); every trial counts; 95% CIs by cluster bootstrap over rules "
    if any(r.get("stub") for r in rs):
        head += ["**STUB DRY RUN — synthetic responses from fixture files. NOT A RESULT.**", ""]
    body, J = [], {"n_trials": len(rs), "models": models}
    for m in models:
        L, j = analyse([r for r in rs if r["model_label"] == m], f"Model `{m}`", rng)
        body += L
        J[m] = j
    if len(models) > 1:
        L, j = analyse(rs, "All models pooled", rng)
        body += L
        J["pooled"] = j
    a.outdir.mkdir(parents=True, exist_ok=True)
    (a.outdir / "results.md").write_text("\n".join(head + body) + "\n", encoding="utf-8")
    (a.outdir / "results.json").write_text(json.dumps(J, indent=1), encoding="utf-8")
    print("\n".join(head + body))
    return 0


if __name__ == "__main__":
    sys.exit(main())
