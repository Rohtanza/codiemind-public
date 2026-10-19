// R96_105 (T3): "Performance: Cleanup Cytoscape instances and event listeners on unmount."
// Governed construct: a Cytoscape instance created inside a component lifecycle -- a call (or
// `new`) whose callee is BOUND to the 'cytoscape' package's default export (default import under
// any name, `import * as`, `import x = require(...)`, `require(...)`, `.default`, local aliases),
// inside a useEffect/useLayoutEffect callback or a class componentDidMount.
// Conformance: the matching cleanup (function returned from that effect, or the class's
// componentWillUnmount, following calls into same-file helpers) calls destroy() on the instance
// (through any name it was stored under), and every window/document addEventListener made in
// that lifecycle has a matching removeEventListener (same target, type and handler) or is tied to
// an AbortSignal that the cleanup aborts. off()/removeAllListeners()/elements().remove() alone do
// not count. Binding is resolved with the checker, so shadowed or unrelated names are ignored.
module.exports = {
  tier: "T3",
  verify(ctx) {
    const { ts, sourceFile, checker, program } = ctx;
    const MOD = "cytoscape";
    const ev = [];
    let bad = 0;
    const where = (n) => sourceFile.getLineAndCharacterOfPosition(n.getStart(sourceFile));
    const first = (n) => n.getText(sourceFile).split("\n")[0].slice(0, 160);

    const strip = (e) => {
      for (let i = 0; e && i < 20; i++) {
        if (ts.isParenthesizedExpression(e) || ts.isNonNullExpression(e) ||
            ts.isAsExpression(e) || ts.isTypeAssertionExpression(e) ||
            (ts.isSatisfiesExpression && ts.isSatisfiesExpression(e)) || ts.isAwaitExpression(e)) {
          e = e.expression;
        } else break;
      }
      return e;
    };
    const isLibSym = (sym) => !!sym && (sym.declarations || []).some(
      (d) => program.isSourceFileDefaultLibrary(d.getSourceFile()));
    const symOf = (id) => { try { return checker.getSymbolAtLocation(id); } catch (e) { return undefined; } };
    const strLit = (e) => !!e && (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) ? e.text : undefined;

    // `require('cytoscape')` (unshadowed require) or dynamic `import('cytoscape')`
    const isModuleLoad = (e) => {
      e = strip(e);
      if (!e || !ts.isCallExpression(e) || e.arguments.length < 1) return false;
      if (strLit(e.arguments[0]) !== MOD) return false;
      if (e.expression.kind === ts.SyntaxKind.ImportKeyword) return true;
      if (ts.isIdentifier(e.expression) && e.expression.text === "require") {
        const s = symOf(e.expression);
        return !s || isLibSym(s);
      }
      return false;
    };

    // Does this expression evaluate to the cytoscape default export (the factory)?
    const isFactoryExpr = (e, depth) => {
      e = strip(e);
      if (!e || depth > 10) return false;
      if (isModuleLoad(e)) return true; // CommonJS: module.exports is the factory
      if (ts.isPropertyAccessExpression(e) && e.name.text === "default") {
        return isModuleLoad(e.expression) || isFactoryExpr(e.expression, depth + 1);
      }
      if (ts.isIdentifier(e)) return isFactorySym(symOf(e), depth + 1);
      return false;
    };
    const isFactorySym = (sym, depth) => {
      if (!sym || depth > 10) return false;
      for (const d of sym.declarations || []) {
        if (ts.isImportClause(d)) {
          const decl = d.parent;
          if (decl && ts.isImportDeclaration(decl) && strLit(decl.moduleSpecifier) === MOD) return true;
        } else if (ts.isNamespaceImport(d)) {
          const decl = d.parent.parent;
          if (decl && ts.isImportDeclaration(decl) && strLit(decl.moduleSpecifier) === MOD) return true;
        } else if (ts.isImportSpecifier(d)) {
          const decl = d.parent.parent.parent;
          const imported = (d.propertyName || d.name).text;
          if (imported === "default" && decl && ts.isImportDeclaration(decl) &&
              strLit(decl.moduleSpecifier) === MOD) return true;
        } else if (ts.isImportEqualsDeclaration(d)) {
          const r = d.moduleReference;
          if (ts.isExternalModuleReference(r) && strLit(r.expression) === MOD) return true;
        } else if (ts.isVariableDeclaration(d) && ts.isIdentifier(d.name) && d.initializer) {
          if (isFactoryExpr(d.initializer, depth + 1)) return true;
        } else if (ts.isBindingElement(d) && ts.isIdentifier(d.name)) {
          const prop = d.propertyName ? (ts.isIdentifier(d.propertyName) ? d.propertyName.text : strLit(d.propertyName)) : d.name.text;
          const pat = d.parent;
          const holder = pat && pat.parent;
          if (prop === "default" && holder && ts.isVariableDeclaration(holder) && holder.initializer &&
              isModuleLoad(holder.initializer)) return true;
        }
      }
      return false;
    };

    const isFn = (n) => ts.isArrowFunction(n) || ts.isFunctionExpression(n) || ts.isFunctionDeclaration(n) ||
      ts.isMethodDeclaration(n);
    const calleeName = (c) => {
      c = strip(c);
      if (ts.isIdentifier(c)) return c.text;
      if (ts.isPropertyAccessExpression(c)) return c.name.text;
      return undefined;
    };
    const methodName = (m) => m.name && (ts.isIdentifier(m.name) ? m.name.text : strLit(m.name));

    // nearest enclosing lifecycle: {kind, fn, cls?}
    const lifecycleOf = (n) => {
      for (let p = n.parent; p; p = p.parent) {
        if (ts.isArrowFunction(p) || ts.isFunctionExpression(p)) {
          const call = p.parent;
          if (call && ts.isCallExpression(call) && call.arguments[0] === p) {
            const nm = calleeName(call.expression);
            if (nm === "useEffect" || nm === "useLayoutEffect") return { kind: "effect", fn: p };
          }
        }
        if (ts.isMethodDeclaration(p) && methodName(p) === "componentDidMount" && p.body &&
            p.parent && ts.isClassLike(p.parent)) {
          return { kind: "class", fn: p, cls: p.parent };
        }
      }
      return undefined;
    };

    // key for a storage location: identifier -> symbol; property chain -> normalized text
    const keyOf = (e) => {
      e = strip(e);
      if (!e) return undefined;
      if (ts.isIdentifier(e)) { const s = symOf(e); return s ? { sym: s } : { text: e.text }; }
      if (ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e) ||
          e.kind === ts.SyntaxKind.ThisKeyword) {
        return { text: e.getText(sourceFile).replace(/\s+/g, "").replace(/\?\./g, ".").replace(/!/g, "") };
      }
      return undefined;
    };
    const sameKey = (a, b) => !!a && !!b && ((a.sym && b.sym && a.sym === b.sym) || (a.text && b.text && a.text === b.text));
    const hasKey = (keys, k) => keys.some((x) => sameKey(x, k));

    // where does the creation result get stored?
    const storageOf = (creation) => {
      let n = creation;
      while (n.parent && (ts.isParenthesizedExpression(n.parent) || ts.isAsExpression(n.parent) ||
             ts.isNonNullExpression(n.parent) || ts.isAwaitExpression(n.parent))) n = n.parent;
      const p = n.parent;
      if (p && ts.isVariableDeclaration(p) && p.initializer === n && ts.isIdentifier(p.name)) return keyOf(p.name);
      if (p && ts.isBinaryExpression(p) && p.right === n && p.operatorToken.kind === ts.SyntaxKind.EqualsToken) return keyOf(p.left);
      if (p && ts.isPropertyDeclaration(p) && p.initializer === n) return { text: "this." + p.name.getText(sourceFile) };
      return undefined;
    };

    // propagate aliases (`x = cy`, `const y = cy`, `ref.current = cy`) within the lifecycle body
    const aliasesIn = (root, start) => {
      const keys = start ? [start] : [];
      for (let round = 0; round < 4; round++) {
        let grew = false;
        const visit = (n) => {
          let src, dst;
          if (ts.isVariableDeclaration(n) && n.initializer && ts.isIdentifier(n.name)) { src = n.initializer; dst = n.name; }
          else if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken) { src = n.right; dst = n.left; }
          if (src && dst) {
            const ks = keyOf(src);
            const kd = keyOf(dst);
            if (ks && kd && hasKey(keys, ks) && !hasKey(keys, kd)) { keys.push(kd); grew = true; }
          }
          ts.forEachChild(n, visit);
        };
        visit(root);
        if (!grew) break;
      }
      return keys;
    };

    // cleanup functions for a lifecycle
    const fnFromExpr = (e, depth) => {
      e = strip(e);
      if (!e || depth > 5) return undefined;
      if (ts.isArrowFunction(e) || ts.isFunctionExpression(e)) return e;
      if (ts.isIdentifier(e)) {
        const s = symOf(e);
        for (const d of (s && s.declarations) || []) {
          if (d.getSourceFile() !== sourceFile) continue;
          if (ts.isFunctionDeclaration(d) && d.body) return d;
          if (ts.isVariableDeclaration(d) && d.initializer) { const f = fnFromExpr(d.initializer, depth + 1); if (f) return f; }
        }
      }
      return undefined;
    };
    const cleanupsOf = (lc) => {
      const out = [];
      if (lc.kind === "effect") {
        const fn = lc.fn;
        if (!ts.isBlock(fn.body)) { const f = fnFromExpr(fn.body, 0); if (f) out.push(f); return out; }
        const visit = (n) => {
          if (n !== fn && isFn(n)) return; // returns of nested functions are not the cleanup
          if (ts.isReturnStatement(n) && n.expression) { const f = fnFromExpr(n.expression, 0); if (f) out.push(f); }
          ts.forEachChild(n, visit);
        };
        visit(fn.body);
      } else {
        for (const m of lc.cls.members) {
          if (methodName(m) !== "componentWillUnmount") continue;
          if (ts.isMethodDeclaration(m) && m.body) out.push(m);
          else if (ts.isPropertyDeclaration(m) && m.initializer) { const f = fnFromExpr(m.initializer, 0); if (f) out.push(f); }
        }
      }
      return out;
    };

    // all nodes reachable in a cleanup, following calls to same-file functions / class methods
    const gatherCalls = (roots, cls) => {
      const calls = [];
      const seen = new Set();
      const walk = (fn, depth) => {
        if (!fn || seen.has(fn) || depth > 4) return;
        seen.add(fn);
        const visit = (n) => {
          if (ts.isCallExpression(n)) {
            calls.push(n);
            const c = strip(n.expression);
            let target;
            if (ts.isIdentifier(c)) target = fnFromExpr(c, 0);
            else if (cls && ts.isPropertyAccessExpression(c) && c.expression.kind === ts.SyntaxKind.ThisKeyword) {
              for (const m of cls.members) {
                if (methodName(m) !== c.name.text) continue;
                if (ts.isMethodDeclaration(m) && m.body) target = m;
                else if (ts.isPropertyDeclaration(m) && m.initializer) target = fnFromExpr(m.initializer, 0);
              }
            }
            if (target) walk(target, depth + 1);
          }
          ts.forEachChild(n, visit);
        };
        visit(fn.body || fn);
      };
      for (const r of roots) walk(r, 0);
      return calls;
    };

    // window/document receiver bound to the platform global
    const domTarget = (e) => {
      e = strip(e);
      if (ts.isIdentifier(e) && (e.text === "window" || e.text === "document")) {
        const s = symOf(e);
        return (!s || isLibSym(s)) ? e.text : undefined;
      }
      if (ts.isPropertyAccessExpression(e) && e.name.text === "document" && domTarget(e.expression) === "window") return "document";
      if (ts.isPropertyAccessExpression(e) && e.name.text === "window" && domTarget(e.expression) === "window") return "window";
      return undefined;
    };
    const listenerCalls = (root, name, excludeFns) => {
      const out = [];
      const visit = (n) => {
        if (excludeFns.indexOf(n) >= 0) return;
        if (ts.isCallExpression(n)) {
          const c = strip(n.expression);
          if (ts.isPropertyAccessExpression(c) && c.name.text === name) {
            const t = domTarget(c.expression);
            if (t) out.push({ call: n, target: t });
          }
        }
        ts.forEachChild(n, visit);
      };
      visit(root);
      return out;
    };
    const signalKey = (opts) => {
      opts = strip(opts);
      if (!opts || !ts.isObjectLiteralExpression(opts)) return undefined;
      for (const p of opts.properties) {
        if (p.name && ts.isIdentifier(p.name) && p.name.text === "signal") {
          if (ts.isPropertyAssignment(p)) {
            let v = strip(p.initializer);
            if (ts.isPropertyAccessExpression(v) && v.name.text === "signal") return keyOf(v.expression);
            return keyOf(v);
          }
          if (ts.isShorthandPropertyAssignment(p)) return keyOf(p.name);
        }
      }
      return undefined;
    };
    const typeKey = (e) => { const s = strLit(strip(e)); return s !== undefined ? { text: "'" + s + "'" } : keyOf(e); };

    // find creation sites
    const creations = [];
    const visit = (n) => {
      if ((ts.isCallExpression(n) || ts.isNewExpression(n)) && isFactoryExpr(n.expression, 0)) creations.push(n);
      ts.forEachChild(n, visit);
    };
    visit(sourceFile);

    for (const cr of creations) {
      const lc = lifecycleOf(cr);
      if (!lc) continue; // not created in a component lifecycle: not an instance of the construct
      const p = where(cr);
      const problems = [];
      const cleanups = cleanupsOf(lc);
      const cleanupCalls = gatherCalls(cleanups, lc.cls);
      // instance keys: storage + aliases within the lifecycle body (and the class for this.* fields)
      const store = storageOf(cr);
      let keys = store ? aliasesIn(lc.fn, store) : [];
      if (!cleanups.length) problems.push("no cleanup");
      else if (!keys.length) problems.push("instance not stored; cannot be destroyed");
      else {
        const destroyed = cleanupCalls.some((c) => {
          const callee = strip(c.expression);
          if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "destroy") return false;
          const k = keyOf(callee.expression);
          return hasKey(keys, k);
        }) || cleanups.some((f) => {
          // local alias in cleanup of a stored key
          const local = [];
          const v = (n) => {
            if (ts.isVariableDeclaration(n) && n.initializer && ts.isIdentifier(n.name) && hasKey(keys, keyOf(n.initializer))) local.push(keyOf(n.name));
            ts.forEachChild(n, v);
          };
          v(f);
          return local.length > 0 && cleanupCalls.some((c) => {
            const callee = strip(c.expression);
            return ts.isPropertyAccessExpression(callee) && callee.name.text === "destroy" && hasKey(local, keyOf(callee.expression));
          });
        });
        if (!destroyed) problems.push("cleanup does not call destroy() on the instance");
      }
      // DOM listeners added in the same lifecycle (excluding the cleanup functions themselves)
      const adds = listenerCalls(lc.fn, "addEventListener", lc.kind === "effect" ? cleanups : []);
      const removes = cleanupCalls.filter((c) => {
        const callee = strip(c.expression);
        return ts.isPropertyAccessExpression(callee) && callee.name.text === "removeEventListener" && domTarget(callee.expression);
      });
      const aborts = cleanupCalls.filter((c) => {
        const callee = strip(c.expression);
        return ts.isPropertyAccessExpression(callee) && callee.name.text === "abort";
      }).map((c) => keyOf(strip(c.expression).expression));
      for (const a of adds) {
        const args = a.call.arguments;
        const sig = args[2] && signalKey(args[2]);
        if (sig && aborts.some((k) => sameKey(k, sig))) continue;
        const tk = typeKey(args[0]);
        const hk = args[1] && keyOf(args[1]);
        const ok = !!hk && removes.some((r) => {
          const rc = strip(r.expression);
          return domTarget(rc.expression) === a.target && r.arguments.length >= 2 &&
            sameKey(typeKey(r.arguments[0]), tk) && sameKey(keyOf(r.arguments[1]), hk);
        });
        if (!ok) problems.push(a.target + " listener " + first(args[0] || a.call) + " not removed");
      }
      if (problems.length) bad += 1;
      ev.push({ line: p.line + 1, column: p.character + 1,
                node_kind: (ts.isNewExpression(cr) ? "NewExpression" : "CallExpression") + ":cytoscape-instance:" +
                  (problems.length ? "violated" : "cleaned-up"),
                text: first(cr) + (problems.length ? "  [" + problems.join("; ") + "]" : "") });
    }
    if (ev.length === 0) return { outcome: "NOT_APPLICABLE", evidence: [] };
    return { outcome: bad ? "VIOLATED" : "SATISFIED", evidence: ev };
  },
};
