// Stage 4 verifier bridge ([G] and §5 item 5).
//
// stdin : {"jobs": [job, ...]}
// stdout: {"ts": "<version>", "results": [result, ...]}   (same order as jobs)
//
// job {"op": "gate",   "code": str, "kind": "ts"|"tsx"|"js"|"jsx"}
//   -> {"ok": true, "malformed": bool, "diagnostics": [{"line", "message"}]}
//      Parse success only: type errors never fail the gate.
// job {"op": "tsquery", "selector": str, "code": str, "kind": ...} -> {"ok", "count", "nodes"}
//   Lower-tier (T2) check for adversarial fixtures; not available to verifiers.
// job {"op": "verify", "module": path, "tier": "T2"|"T3", "code": str, "kind": ...}
//   -> {"ok": true, "outcome", "evidence": [{"line","column","node_kind","text"}]}
//   |  {"ok": false, "error": str}
//
// The tier is enforced by what the verifier receives, not by trust:
//   T2: { text, fileName, sourceFile, ts, tsquery }          one file, no program, no checker
//   T3: the T2 fields + { program, checker, ambient }         unit + D1 ambient context
// Verifier modules run in a fresh vm context with no require, process, timers, Date or
// Math.random (purity), and the `ts` they receive has no `sys` and no
// program/host/language-service factories. Each call has a 5 s timeout.
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const ts = require("typescript");
const { tsquery } = require("@phenomnomnominal/tsquery");

const OUTCOMES = new Set(["SATISFIED", "VIOLATED", "NOT_APPLICABLE"]);
const KIND = { ts: ts.ScriptKind.TS, tsx: ts.ScriptKind.TSX, js: ts.ScriptKind.JS, jsx: ts.ScriptKind.JSX };
const EXT = { ts: ".ts", tsx: ".tsx", js: ".js", jsx: ".jsx" };
const ROOT = "/proj";

// D1: a package.json and a tsconfig, no source tree.
const AMBIENT = Object.freeze({
  packageJson: Object.freeze({ name: "case", version: "0.0.0", private: true, type: "module" }),
  compilerOptions: Object.freeze({
    target: "ES2022", module: "ESNext", moduleResolution: "Bundler", jsx: "preserve",
    strict: true, allowJs: true, skipLibCheck: true, noEmit: true, baseUrl: ".",
    paths: { "@/*": ["src/*"] }, lib: ["ES2022", "DOM"],
  }),
});
const OPTIONS = {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler, jsx: ts.JsxEmit.Preserve, strict: true,
  allowJs: true, skipLibCheck: true, noEmit: true, baseUrl: ROOT, paths: { "@/*": ["src/*"] },
  lib: ["lib.es2022.d.ts", "lib.dom.d.ts"], types: [],
};

const libDir = path.dirname(ts.getDefaultLibFilePath(OPTIONS));
const libCache = new Map();

function sourceFile(code, kind) {
  return ts.createSourceFile(`${ROOT}/src/unit${EXT[kind]}`, code, ts.ScriptTarget.Latest, true, KIND[kind]);
}

function gate(job) {
  const sf = sourceFile(job.code, job.kind);
  const host = ts.createCompilerHost({ noLib: true });
  host.getSourceFile = (f) => (f === sf.fileName ? sf : undefined);
  host.fileExists = (f) => f === sf.fileName;
  const program = ts.createProgram({ rootNames: [sf.fileName], options: { noLib: true, allowJs: true, noResolve: true }, host });
  const diags = program.getSyntacticDiagnostics(sf);
  return {
    ok: true, malformed: diags.length > 0,
    diagnostics: diags.map((d) => ({
      line: d.start === undefined ? 0 : sf.getLineAndCharacterOfPosition(d.start).line + 1,
      message: ts.flattenDiagnosticMessageText(d.messageText, "\n"),
    })),
  };
}

function program(sf) {
  const host = ts.createCompilerHost(OPTIONS);
  host.getSourceFile = (f, lang) => {
    if (f === sf.fileName) return sf;
    if (path.dirname(f) === libDir) {
      if (!libCache.has(f)) libCache.set(f, ts.createSourceFile(f, fs.readFileSync(f, "utf8"), lang));
      return libCache.get(f);
    }
    return undefined;
  };
  host.fileExists = (f) => f === sf.fileName || (path.dirname(f) === libDir && fs.existsSync(f));
  host.readFile = (f) => (path.dirname(f) === libDir ? fs.readFileSync(f, "utf8") : undefined);
  host.directoryExists = (d) => d === ROOT || d === `${ROOT}/src` || d === libDir;
  host.getDirectories = () => [];
  host.getCurrentDirectory = () => ROOT;
  return ts.createProgram({ rootNames: [sf.fileName], options: OPTIONS, host });
}

const BANNED = ["sys", "createProgram", "createCompilerHost", "createWatchProgram",
  "createLanguageService", "createIncrementalProgram", "createSemanticDiagnosticsBuilderProgram",
  "createEmitAndSemanticDiagnosticsBuilderProgram", "createSolutionBuilder", "createSolutionBuilderHost"];
const tsSafe = Object.freeze(Object.fromEntries(Object.entries(ts).filter(([k]) => !BANNED.includes(k))));

const DENY = new Set(["constructor", "__proto__", "prototype", "process", "require", "globalThis",
  "global", "eval", "Function", "Date", "Reflect", "Proxy", "WebAssembly", "setTimeout",
  "setInterval", "setImmediate", "queueMicrotask", "fetch", "XMLHttpRequest", "Symbol"]);
const modCache = new Map();
function load(modPath) {
  if (modCache.has(modPath)) return modCache.get(modPath);
  const src = fs.readFileSync(modPath, "utf8");
  // Escape-capable names are refused by parsing the module (identifiers and property names
  // only, so comments and strings do not count). The vm alone does not stop
  // ctx.constructor.constructor("return process")(), because ctx comes from the host realm.
  // A name built at run time (c["constr" + "uctor"]) is NOT caught here; the second layer is
  // the Node permission model the bridge runs under (runtime.py: --permission, read-only access
  // to the verifier tree, no fs writes, no child processes, no workers). Against deliberate
  // obfuscation these are guards, not proof; verifier sources are published for inspection.
  const modSf = ts.createSourceFile(modPath, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const hits = [];
  const scan = (n) => {
    if ((ts.isIdentifier(n) || ts.isPrivateIdentifier(n)) && DENY.has(n.text)) hits.push(n.text);
    if (n.kind === ts.SyntaxKind.ImportKeyword) hits.push("import");
    ts.forEachChild(n, scan);
  };
  scan(modSf);
  if (hits.length) throw new Error(`module uses forbidden names: ${[...new Set(hits)].join(", ")}`);
  const sandbox = { module: { exports: {} } };
  sandbox.exports = sandbox.module.exports;
  const context = vm.createContext(sandbox, { codeGeneration: { strings: false, wasm: false } });
  vm.runInContext("delete globalThis.Date; Math.random = undefined;", context);
  vm.runInContext(src, context, { filename: modPath, timeout: 5000 });
  const entry = { context, exports: context.module.exports };
  modCache.set(modPath, entry);
  return entry;
}

function verify(job) {
  const { context, exports } = load(job.module);
  if (typeof exports.verify !== "function") throw new Error("module exports no verify()");
  if (exports.tier !== job.tier) throw new Error(`module declares tier ${exports.tier}, registry says ${job.tier}`);
  const sf = sourceFile(job.code, job.kind);
  const ctx = { text: job.code, fileName: sf.fileName, sourceFile: sf, ts: tsSafe, tsquery };
  if (job.tier === "T3") {
    const p = program(sf);
    Object.assign(ctx, { program: p, checker: p.getTypeChecker(), ambient: AMBIENT });
  } else if (job.tier !== "T2") {
    throw new Error(`bridge runs T2/T3 only, got ${job.tier}`);
  }
  context.__ctx = Object.freeze(ctx);
  const res = vm.runInContext("module.exports.verify(__ctx)", context, { timeout: 5000 });
  delete context.__ctx;
  if (!res || !OUTCOMES.has(res.outcome)) throw new Error(`bad outcome ${res && res.outcome}`);
  const evidence = (res.evidence || []).map((e) => ({
    line: Number(e.line) || 0, column: Number(e.column) || 0,
    node_kind: String(e.node_kind || ""), text: String(e.text || "").slice(0, 200),
  }));
  return { ok: true, outcome: res.outcome, evidence };
}

let raw = "";
process.stdin.on("data", (d) => (raw += d));
process.stdin.on("end", () => {
  const { jobs } = JSON.parse(raw);
  const results = jobs.map((job) => {
    try {
      if (!KIND[job.kind]) throw new Error(`unknown kind ${job.kind}`);
      if (job.op === "gate") return gate(job);
      if (job.op === "verify") return verify(job);
      if (job.op === "tsquery") {
        const sf = sourceFile(job.code, job.kind);
        const nodes = tsquery(sf, job.selector);
        return { ok: true, count: nodes.length, nodes: nodes.slice(0, 5).map((n) => ({
          kind: ts.SyntaxKind[n.kind], line: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1 })) };
      }
      throw new Error(`unknown op ${job.op}`);
    } catch (e) {
      return { ok: false, error: String((e && e.message) || e) };
    }
  });
  process.stdout.write(JSON.stringify({ ts: ts.version, results }));
});
