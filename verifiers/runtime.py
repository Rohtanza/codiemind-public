"""[G] gate, verifier execution and the response pipeline.

Tier is enforced by what a verifier receives (item 5):
  T1 (Python, any language)  ctx = {text, fileName}                 imports allowed: re
  T2 (Python, py target)     ctx = {text, fileName, tree}           imports allowed: ast, re
  T2/T3 (JS, ts target)      run by bridge/bridge.js in a vm sandbox (see that file)
Python verifiers are executed with a whitelisted set of builtins and no I/O, clock or randomness.
"""
from __future__ import annotations

import ast
import json
import pathlib
import re
import subprocess

from contract import ContractError, Evidence, ResponseVerdict, VerdictT, combine
from extract import Unit, extract

HERE = pathlib.Path(__file__).resolve().parent
BRIDGE = HERE / "bridge" / "bridge.js"
EXT = {"ts": ".ts", "tsx": ".tsx", "js": ".js", "jsx": ".jsx", "py": ".py"}
TARGET_LANGS = {"ts": ("ts", "js"), "py": ("py",)}

# ---------------------------------------------------------------- bridge

def bridge(jobs: list[dict]) -> list[dict]:
    if not jobs:
        return []
    # Node permission model: read-only access to the verifier tree and to the directories of
    # the modules being run; no fs writes, child processes or workers (bridge.js header).
    reads = sorted({str(HERE)} | {str(pathlib.Path(j["module"]).parent) for j in jobs if "module" in j})
    cmd = ["node", "--permission", *[f"--allow-fs-read={d}/*" for d in reads], str(BRIDGE)]
    p = subprocess.run(cmd, input=json.dumps({"jobs": jobs}),
                       capture_output=True, text=True, cwd=BRIDGE.parent, timeout=600)
    if p.returncode != 0:
        raise RuntimeError(f"bridge failed: {p.stderr[-2000:]}")
    return json.loads(p.stdout)["results"]


# ---------------------------------------------------------------- [G] gate

def gate(units: list[Unit]) -> list[tuple[Unit, bool, str]]:
    """(unit, malformed, detail). Parse success only; type errors never fail the gate."""
    out, ts_jobs, ts_idx = [], [], []
    for i, u in enumerate(units):
        if u.language == "py":
            try:
                ast.parse(u.code)
                out.append((u, False, ""))
            except SyntaxError as e:
                out.append((u, True, f"line {e.lineno}: {e.msg}"))
        else:
            out.append(None)
            ts_jobs.append({"op": "gate", "code": u.code, "kind": u.kind})
            ts_idx.append(i)
    for i, r in zip(ts_idx, bridge(ts_jobs)):
        if not r.get("ok"):
            raise RuntimeError(f"gate error: {r.get('error')}")
        d = "; ".join(f"line {x['line']}: {x['message']}" for x in r["diagnostics"][:3])
        out[i] = (units[i], r["malformed"], d)
    return out


# ---------------------------------------------------------------- Python verifiers

_SAFE_BUILTINS = {n: __builtins__[n] if isinstance(__builtins__, dict) else getattr(__builtins__, n)
                  for n in ("len", "range", "enumerate", "isinstance", "list", "dict", "set",
                            "tuple", "str", "int", "float", "bool", "any", "all", "min", "max",
                            "sorted", "zip", "reversed", "sum", "abs", "map", "filter", "iter",
                            "next", "hasattr", "getattr", "frozenset", "ValueError", "KeyError",
                            "IndexError", "TypeError", "StopIteration", "Exception", "print",
                            "__build_class__", "object", "staticmethod", "property", "super")}
_ALLOWED = {"T1": {"re"}, "T2": {"ast", "re"}}
_MODULES = {"re": re, "ast": ast}
_pycache: dict[str, dict] = {}


def _load_py(path: pathlib.Path, tier: str) -> dict:
    key = f"{path}:{tier}"
    if key in _pycache:
        return _pycache[key]
    src = path.read_text(encoding="utf-8")
    for node in ast.walk(ast.parse(src)):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            names = [a.name for a in node.names] if isinstance(node, ast.Import) else [node.module]
            bad = [n for n in names if n not in _ALLOWED[tier]]
            if bad:
                raise ContractError(f"{path.name}: {tier} verifier may not import {bad}")
        if isinstance(node, ast.Attribute) and node.attr.startswith("__"):
            raise ContractError(f"{path.name}: dunder attribute access {node.attr}")

    def _imp(name, *a, **k):
        if name not in _ALLOWED[tier]:
            raise ImportError(name)
        return _MODULES[name]

    ns = {"__builtins__": {**_SAFE_BUILTINS, "__import__": _imp}, "__name__": path.stem}
    exec(compile(src, str(path), "exec"), ns)  # noqa: S102 - restricted namespace above
    if ns.get("TIER") != tier or not callable(ns.get("verify")):
        raise ContractError(f"{path.name}: needs TIER = {tier!r} and verify(ctx)")
    _pycache[key] = ns
    return ns


def _py_verdict(path: pathlib.Path, tier: str, unit: Unit) -> dict:
    ns = _load_py(path, tier)
    ctx = {"text": unit.code, "fileName": f"/proj/src/unit{EXT[unit.kind]}"}
    if tier == "T2":
        ctx["tree"] = ast.parse(unit.code)
    return ns["verify"](ctx)


# ---------------------------------------------------------------- run

def _to_verdict(res: dict, tier: str, vid: str, fname: str) -> VerdictT:
    ev = tuple(Evidence(fname, int(e.get("line", 0)), int(e.get("column", 0)),
                        str(e.get("node_kind", "")), str(e.get("text", ""))[:200])
               for e in res.get("evidence", []))
    return VerdictT(res["outcome"], tier, ev, vid)


def run_units(entry: dict, units: list[Unit]) -> list[VerdictT]:
    """Verify already-gated units with one registry entry. Raises on contract breach."""
    path, tier, vid = HERE / entry["path"], entry["tier"], entry["verifier_id"]
    out: list[VerdictT | None] = []
    jobs, idx = [], []
    for i, u in enumerate(units):
        fname = f"unit{EXT[u.kind]}"
        if path.suffix == ".py":
            out.append(_to_verdict(_py_verdict(path, tier, u), tier, vid, fname))
        else:
            out.append(None)
            jobs.append({"op": "verify", "module": str(path), "tier": tier, "code": u.code,
                         "kind": u.kind})
            idx.append(i)
    for i, r in zip(idx, bridge(jobs)):
        if not r.get("ok"):
            raise ContractError(f"{vid}: {r.get('error')}")
        out[i] = _to_verdict(r, tier, vid, f"unit{EXT[units[i].kind]}")
    return out  # type: ignore[return-value]


def score_response(response: str, entry: dict, expected_language: str | None = None) -> ResponseVerdict:
    """[E] -> [G] -> [V] on one LLM response. Prose never reaches the verifier."""
    vid = entry["verifier_id"]
    units = [u for u in extract(response, expected_language)
             if u.language in TARGET_LANGS[entry["target"]]]
    if not units:
        return ResponseVerdict("NO_CODE", vid, detail="no fenced block in a target language")
    gated = gate(units)
    bad = [d for _, m, d in gated if m]
    if bad:
        return ResponseVerdict("MALFORMED", vid, detail=bad[0])
    verdicts = run_units(entry, units)
    return ResponseVerdict(combine(verdicts, vid), vid, tuple(verdicts))
