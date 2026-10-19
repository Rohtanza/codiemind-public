// R11_35 (T3): "Use playwright for testing."
// Governed construct: a test-framework entry point (test / it / describe / expect / hooks /
// jest / vi / cy ...) used in the file, together with the binding that provides it, plus every
// binding imported or required from a known test-framework module. An entry point is
// conforming only when its binding resolves (through imports, requires, aliases and local
// derivations such as `const test = base.extend(...)`) to a Playwright package. An entry-point
// name that resolves to nothing in the file (an ambient global: Jest, Vitest globals, Mocha,
// Jasmine, Cypress) is a violation, since Playwright exposes no globals. A local function that
// merely happens to be called `test` is not an entry point. Files with no instance are
// NOT_APPLICABLE.
module.exports = {
  tier: "T3",
  verify(ctx) {
    const { ts, sourceFile, checker, program } = ctx;
    const ev = [];
    let bad = 0;
    let tests = 0;
    const deferred = [];

    const ENTRY = new Set([
      "describe", "it", "test", "expect", "beforeEach", "afterEach", "beforeAll", "afterAll",
      "before", "after", "suite", "context", "specify", "fit", "fdescribe", "xit", "xdescribe",
      "xtest", "jest", "vi", "cy", "Cypress", "setup", "teardown", "suiteSetup", "suiteTeardown",
    ]);
    const TEST_DEFINERS = new Set([
      "describe", "it", "test", "suite", "context", "specify", "fit", "fdescribe", "xit",
      "xdescribe", "xtest",
    ]);
    const isPlaywright = (m) => /^@playwright\//.test(m) || m === "playwright-test";
    const OTHER = /^(jest|@jest\/globals|jest-.*|@jest\/.*|vitest|vitest\/.*|mocha|chai|chai\/.*|chai-.*|node:test|test|bun:test|cypress|cypress\/.*|jasmine|jasmine-core|ava|tap|tape|uvu|uvu\/.*|qunit|@japa\/runner|sinon|should|expect|@vitest\/.*|@cypress\/.*)$/;
    const isBrowserAlt = (m) => /^(puppeteer|puppeteer-core|jest-puppeteer|webdriverio|selenium-webdriver|testcafe|nightwatch|protractor)$/.test(m);

    const where = (n) => sourceFile.getLineAndCharacterOfPosition(n.getStart(sourceFile));
    const push = (n, kind, ok) => {
      const p = where(n);
      if (!ok) bad += 1;
      ev.push({ line: p.line + 1, column: p.character + 1, node_kind: kind,
        text: n.getText(sourceFile).split("\n")[0].slice(0, 160) });
    };
    const isLib = (d) => program.isSourceFileDefaultLibrary(d.getSourceFile());

    const requireModule = (e) => {
      // strip await / parens / property access / element access down to require('x')
      for (let i = 0; e && i < 12; i++) {
        if (ts.isCallExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === "require"
          && e.arguments.length >= 1 && ts.isStringLiteralLike(e.arguments[0])) {
          return e.arguments[0].text;
        }
        if (ts.isAwaitExpression(e) || ts.isParenthesizedExpression(e) || ts.isAsExpression(e)
          || ts.isNonNullExpression(e) || ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e)
          || ts.isCallExpression(e)) {
          e = e.expression;
        } else if (ts.isCallExpression(e)) {
          e = e.expression;
        } else {
          return undefined;
        }
      }
      return undefined;
    };
    const rootIdent = (e) => {
      for (let i = 0; e && i < 30; i++) {
        if (ts.isIdentifier(e)) return e;
        if (ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e) || ts.isCallExpression(e)
          || ts.isAwaitExpression(e) || ts.isParenthesizedExpression(e) || ts.isAsExpression(e)
          || ts.isNonNullExpression(e) || ts.isTaggedTemplateExpression(e)) {
          e = ts.isTaggedTemplateExpression(e) ? e.tag : e.expression;
        } else {
          return undefined;
        }
      }
      return undefined;
    };

    // Resolve an identifier to { kind: "ambient" | "module" | "local", module? }
    const resolveId = (id, depth) => {
      if (depth > 8) return { kind: "local" };
      const sym = checker.getSymbolAtLocation(id);
      const decls = (sym && sym.declarations) || [];
      if (!sym || decls.length === 0) return { kind: "ambient" };
      if (decls.every(isLib)) return { kind: "ambient" };
      const d = decls.find((x) => !isLib(x)) || decls[0];
      // ESM imports
      let p = d;
      while (p && !ts.isImportDeclaration(p) && !ts.isSourceFile(p)
        && (ts.isImportSpecifier(p) || ts.isNamedImports(p) || ts.isImportClause(p) || ts.isNamespaceImport(p))) {
        p = p.parent;
      }
      if (p && ts.isImportDeclaration(p) && ts.isStringLiteral(p.moduleSpecifier)) {
        return { kind: "module", module: p.moduleSpecifier.text };
      }
      if (ts.isImportEqualsDeclaration(d) && ts.isExternalModuleReference(d.moduleReference)
        && ts.isStringLiteralLike(d.moduleReference.expression)) {
        return { kind: "module", module: d.moduleReference.expression.text };
      }
      // variable / destructuring
      let v = d;
      while (v && (ts.isBindingElement(v) || ts.isObjectBindingPattern(v) || ts.isArrayBindingPattern(v))) v = v.parent;
      if (v && ts.isVariableDeclaration(v) && v.initializer) {
        const m = requireModule(v.initializer);
        if (m !== undefined) return { kind: "module", module: m };
        const r = rootIdent(v.initializer);
        if (r) {
          const res = resolveId(r, depth + 1);
          if (res.kind === "module") return res;
          return { kind: "local" };
        }
      }
      return { kind: "local" };
    };

    // 1. import / require bindings from test-framework or browser-automation modules
    const visitImports = (n) => {
      let mod;
      let node = n;
      if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier)) mod = n.moduleSpecifier.text;
      else if (ts.isImportEqualsDeclaration(n) && ts.isExternalModuleReference(n.moduleReference)
        && ts.isStringLiteralLike(n.moduleReference.expression)) mod = n.moduleReference.expression.text;
      else if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === "require"
        && n.arguments.length >= 1 && ts.isStringLiteralLike(n.arguments[0])
        && !checker.getSymbolAtLocation(n.expression)) mod = n.arguments[0].text;
      else if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword
        && n.arguments.length >= 1 && ts.isStringLiteralLike(n.arguments[0])) mod = n.arguments[0].text;
      if (mod !== undefined) {
        if (isPlaywright(mod)) push(node, "Import:playwright(" + mod + ")", true);
        else if (OTHER.test(mod)) push(node, "Import:other-test-framework(" + mod + ")", false);
        else if (isBrowserAlt(mod)) deferred.push(node, mod);
      }
      ts.forEachChild(n, visitImports);
    };
    visitImports(sourceFile);

    // 2. calls through entry-point identifiers, resolved by binding
    const visitCalls = (n) => {
      if (ts.isCallExpression(n) || ts.isTaggedTemplateExpression(n)) {
        const callee = ts.isCallExpression(n) ? n.expression : n.tag;
        const r = rootIdent(callee);
        // only the outermost call of a chain is counted (e.g. test.describe.only(...)(...))
        const parentIsChain = n.parent && (ts.isPropertyAccessExpression(n.parent) || ts.isElementAccessExpression(n.parent)
          || (ts.isCallExpression(n.parent) && n.parent.expression === n));
        if (r && !parentIsChain) {
          const res = resolveId(r, 0);
          const name = r.text;
          if (res.kind === "ambient" && ENTRY.has(name)) {
            if (TEST_DEFINERS.has(name)) tests += 1;
            push(n, "CallExpression:ambient-global-" + name, false);
          } else if (res.kind === "module") {
            if (isPlaywright(res.module)) {
              tests += 1;
              push(n, "CallExpression:playwright-bound-" + name, true);
            } else if (OTHER.test(res.module)) {
              tests += 1;
              push(n, "CallExpression:" + res.module + "-bound-" + name, false);
            } else if (ENTRY.has(name) && !isBrowserAlt(res.module)) {
              // entry point re-exported from a project module (e.g. Playwright fixtures file);
              // cannot be resolved across files, treated as conforming
              tests += 1;
              push(n, "CallExpression:project-module-bound-" + name, true);
            }
          }
        }
      }
      ts.forEachChild(n, visitCalls);
    };
    visitCalls(sourceFile);

    // 3. alternative browser-automation libraries count only in files that define tests
    if (ev.length > 0 || tests > 0) {
      for (let i = 0; i < deferred.length; i += 2) {
        push(deferred[i], "Import:non-playwright-browser-automation(" + deferred[i + 1] + ")", false);
      }
    }

    if (ev.length === 0) return { outcome: "NOT_APPLICABLE", evidence: [] };
    return { outcome: bad ? "VIOLATED" : "SATISFIED", evidence: ev };
  },
};
