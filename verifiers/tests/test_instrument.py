#!/usr/bin/env python3
"""Instrument self-tests (items 1-3, 5 item 5).

Each check is built to FAIL on the defect it names:
  extraction  multi-block, tagged, untagged (with and without a declared language), no-code,
              prose-only, unterminated fence (left unrepaired)
  gate        MALFORMED vs NO_CODE vs scoreable; a type error is NOT a gate failure
  contract    SATISFIED/VIOLATED without evidence raises; NOT_APPLICABLE may be bare
  sandbox     a JS verifier cannot require, read the clock, use randomness or ts.sys;
              a T2 verifier gets no checker; a module whose declared tier differs is refused;
              a Python T1 verifier cannot import os or open files
  registry    a file edited after registration is reported as a silent fix
Run: python3 tests/test_instrument.py
"""
from __future__ import annotations

import json
import pathlib
import shutil
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(ROOT))
import registry  # noqa: E402
from contract import ContractError, Evidence, VerdictT  # noqa: E402
from extract import extract  # noqa: E402
from runtime import _load_py, bridge, gate  # noqa: E402

results = []


def ok(name: str, cond: bool) -> None:
    results.append((name, cond))


# ---- extraction
r = "intro\n```ts\nconst a = 1;\n```\nmid\n```typescript\nconst b = 2;\n```\n```py\nx = 1\n```\n"
u = extract(r)
ok("multi-block same language concatenated in order",
   [x.language for x in u] == ["ts", "py"] and u[0].code == "const a = 1;\nconst b = 2;" and u[0].blocks == 2)
ok("untagged fence ignored without a declared language", extract("```\nconst a = 1;\n```") == [])
ok("untagged fence taken with a declared language",
   [x.language for x in extract("```\nconst a = 1;\n```", "ts")] == ["ts"])
ok("other-language fence ignored", extract("```bash\nls\n```") == [])
ok("prose only -> no units", extract("use `function (` never") == [])
ok("tsx tag sets kind", extract("```tsx\nconst A = () => <b/>;\n```")[0].kind == "tsx")
ok("unterminated fence kept, not repaired", extract("```ts\nconst a = 1;")[0].code == "const a = 1;")

# ---- gate
g = gate(extract("```ts\nconst x: number = 'type error';\n```\n```ts\n```"))
ok("type error is not MALFORMED", g[0][1] is False)
ok("syntax error is MALFORMED", gate(extract("```ts\nconst = ;\n```"))[0][1] is True)
ok("python syntax error is MALFORMED", gate(extract("```py\ndef (:\n```"))[0][1] is True)

# ---- contract
try:
    VerdictT("SATISFIED", "T2", (), "x")
    ok("SATISFIED without evidence raises", False)
except ContractError:
    ok("SATISFIED without evidence raises", True)
try:
    VerdictT("NOT_APPLICABLE", "T2", (), "x")
    ok("NOT_APPLICABLE may carry no evidence", True)
except ContractError:
    ok("NOT_APPLICABLE may carry no evidence", False)
ok("VIOLATED with evidence accepted",
   VerdictT("VIOLATED", "T1", (Evidence("u.ts", 1, 1, "line", "x"),), "x").outcome == "VIOLATED")

# ---- sandbox (JS)
tmp = pathlib.Path(tempfile.mkdtemp())
probes = {
    "require": "module.exports={tier:'T2',verify(){require('fs');return{outcome:'NOT_APPLICABLE'}}};",
    "clock": "module.exports={tier:'T2',verify(){Date.now();return{outcome:'NOT_APPLICABLE'}}};",
    "random": "module.exports={tier:'T2',verify(){Math.random();return{outcome:'NOT_APPLICABLE'}}};",
    "tssys": "module.exports={tier:'T2',verify(c){c.ts.sys.readFile('/etc/hostname');return{outcome:'NOT_APPLICABLE'}}};",
    "program": "module.exports={tier:'T2',verify(c){c.ts.createProgram([], {});return{outcome:'NOT_APPLICABLE'}}};",
    "process": "module.exports={tier:'T2',verify(){process.exit(0);return{outcome:'NOT_APPLICABLE'}}};",
    "t2checker": "module.exports={tier:'T2',verify(c){return{outcome:c.checker===undefined&&c.program===undefined?'NOT_APPLICABLE':'VIOLATED',evidence:[{line:1}]}}};",
    "tiermismatch": "module.exports={tier:'T3',verify(){return{outcome:'NOT_APPLICABLE'}}};",
    "loop": "module.exports={tier:'T2',verify(){for(;;){}}};",
    "escape": "module.exports={tier:'T2',verify(c){c.constructor.constructor('return process')().exit(0);return{outcome:'NOT_APPLICABLE'}}};",
    "computed": "module.exports={tier:'T2',verify(c){const k='constr'+'uctor';const p=c[k][k]('return pro'+'cess')();const m=p['main'+'Module'];m['req'+'uire']('fs')['writeFileSync']('/tmp/zz_escape','x');return{outcome:'NOT_APPLICABLE'}}};",
    "commentok": "// mentions globalThis.fetch and process in a comment\nmodule.exports={tier:'T2',verify(){const s='require';return{outcome:'NOT_APPLICABLE'}}};",
}
jobs = []
for k, src in probes.items():
    (tmp / f"{k}.js").write_text(src)
    jobs.append({"op": "verify", "module": str(tmp / f"{k}.js"), "tier": "T2", "code": "const a=1;", "kind": "ts"})
res = dict(zip(probes, bridge(jobs)))
for k in ("require", "clock", "random", "tssys", "program", "process", "tiermismatch", "loop",
          "escape"):
    ok(f"sandbox refuses {k}", res[k].get("ok") is False)
ok("escape via run-time-built names is stopped by the permission model, not the denylist",
   res["computed"].get("ok") is False and "allow-fs-write" in res["computed"].get("error", "")
   and not pathlib.Path("/tmp/zz_escape").exists())
ok("names in comments and strings do not trigger refusal", res["commentok"].get("ok") is True)
ok("T2 verifier receives no checker or program",
   res["t2checker"].get("ok") is True and res["t2checker"]["outcome"] == "NOT_APPLICABLE")

# ---- sandbox (Python)
(tmp / "bad.ts.v1.py").write_text("import os\nTIER='T1'\ndef verify(c):\n    return {'outcome':'NOT_APPLICABLE'}\n")
(tmp / "bad2.ts.v1.py").write_text("TIER='T1'\ndef verify(c):\n    open('/etc/hostname')\n    return {'outcome':'NOT_APPLICABLE'}\n")
try:
    _load_py(tmp / "bad.ts.v1.py", "T1")
    ok("python T1 may not import os", False)
except ContractError:
    ok("python T1 may not import os", True)
try:
    _load_py(tmp / "bad2.ts.v1.py", "T1")["verify"]({"text": ""})
    ok("python verifier has no open()", False)
except NameError:
    ok("python verifier has no open()", True)

# ---- registry silent-fix detection (on a scratch copy of the registry)
saved = registry.REG.read_text() if registry.REG.exists() else None
try:
    d = registry.HERE / "reference"
    f = d / "ZZTEST.ts.v1.js"
    f.write_text("module.exports={tier:'T2',verify(){return{outcome:'NOT_APPLICABLE'}}};")
    registry.register(str(f), "ZZTEST", "ts", "T2", "reference")
    ok("fresh registration checks clean", not [e for e in registry.check() if "ZZTEST" in e])
    f.write_text(f.read_text() + "\n// edited")
    ok("edited file reported as silent fix", any("ZZTEST" in e and "silent fix" in e for e in registry.check()))
finally:
    f.unlink(missing_ok=True)
    if saved is None:
        registry.REG.unlink(missing_ok=True)
    else:
        registry.REG.write_text(saved)
shutil.rmtree(tmp)

for name, c in results:
    print(f"{'PASS' if c else 'FAIL'}  {name}")
bad = [n for n, c in results if not c]
print(f"\n{len(results)} checks, {len(bad)} failed" + ("" if not bad else ": " + json.dumps(bad)))
sys.exit(1 if bad else 0)
