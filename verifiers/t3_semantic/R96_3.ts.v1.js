// R96_3 (T3): "Use VS Code configuration API with proper defaults and validation."
// Governed construct: a call of `get` on a vscode.WorkspaceConfiguration, i.e. on the value of
// `workspace.getConfiguration(...)` where `workspace` is bound to the 'vscode' module (namespace,
// default, named/aliased, import-equals, require or dynamic import), whether chained directly,
// held in a variable/property, returned from a local function, or typed as WorkspaceConfiguration.
// Conforming: the call passes a second (default-value) argument that is not `undefined`/`void`,
// and the call itself is not the operand of an `as T` / `<T>` / non-null `!` assertion.
// The 'vscode' module is not resolvable in the one-file program, so binding is traced through
// the checker's symbols back to the import declaration rather than through the resolved type.
module.exports = {
  tier: "T3",
  verify(ctx) {
    const { ts, sourceFile, checker } = ctx;
    const ev = [];
    let bad = 0;
    const where = (n) => sourceFile.getLineAndCharacterOfPosition(n.getStart(sourceFile));
    const MOD = "module", WS = "workspace", GC = "getConfiguration", CFG = "config", CFGT = "configType";

    const strip = (e) => {
      while (e && (ts.isParenthesizedExpression(e) || ts.isNonNullExpression(e) ||
        ts.isAsExpression(e) || ts.isTypeAssertionExpression(e) ||
        (ts.isSatisfiesExpression && ts.isSatisfiesExpression(e)))) e = e.expression;
      return e;
    };
    const isVscodeSpec = (s) => !!s && ts.isStringLiteralLike(s) && s.text === "vscode";
    const importDeclOf = (d) => {
      let p = d;
      while (p && !ts.isImportDeclaration(p)) p = p.parent;
      return p && isVscodeSpec(p.moduleSpecifier) ? p : undefined;
    };
    const memberName = (e) => {
      if (ts.isPropertyAccessExpression(e)) return e.name.text;
      if (ts.isElementAccessExpression(e) && e.argumentExpression &&
        ts.isStringLiteralLike(e.argumentExpression)) return e.argumentExpression.text;
      return undefined;
    };
    const step = (base, name) => {
      if (base === MOD && name === "workspace") return WS;
      if (base === WS && name === "getConfiguration") return GC;
      return null;
    };

    const active = new Set();
    const guard = (key, fn) => {
      if (!key || active.has(key) || active.size > 64) return null;
      active.add(key);
      try { return fn(); } finally { active.delete(key); }
    };

    // Kind of a type annotation: WorkspaceConfiguration from 'vscode'?
    const typeKind = (t) => {
      if (!t) return null;
      if (ts.isParenthesizedTypeNode(t)) return typeKind(t.type);
      if (ts.isUnionTypeNode(t)) return t.types.some((m) => typeKind(m) === CFGT) ? CFGT : null;
      if (ts.isTypeOperatorNode(t)) return typeKind(t.type);
      if (ts.isImportTypeNode(t)) {
        const arg = t.argument;
        const ok = arg && ts.isLiteralTypeNode(arg) && isVscodeSpec(arg.literal);
        const q = t.qualifier;
        const last = q && (ts.isIdentifier(q) ? q.text : q.right.text);
        return ok && last === "WorkspaceConfiguration" ? CFGT : null;
      }
      if (ts.isTypeReferenceNode(t)) {
        const n = t.typeName;
        if (ts.isQualifiedName(n)) {
          if (n.right.text !== "WorkspaceConfiguration") return null;
          return ts.isIdentifier(n.left) && identKind(n.left) === MOD ? CFGT : null;
        }
        const sym = checker.getSymbolAtLocation(n);
        return (sym && sym.declarations || []).some((d) => ts.isImportSpecifier(d) && importDeclOf(d) &&
          (d.propertyName || d.name).text === "WorkspaceConfiguration") ? CFGT : null;
      }
      return null;
    };
    const asValue = (k) => (k === CFGT ? CFG : k);

    // Kind of the source a binding pattern destructures.
    const patternSourceKind = (pat) => {
      const p = pat.parent;
      if (ts.isVariableDeclaration(p) || ts.isParameter(p)) return p.initializer ? exprKind(p.initializer) : null;
      if (ts.isBindingElement(p)) return bindingKind(p);
      return null;
    };
    const bindingKind = (b) => guard(b, () => {
      const name = b.propertyName || b.name;
      const key = ts.isIdentifier(name) || ts.isStringLiteralLike(name) ? name.text : undefined;
      if (!key) return null;
      return step(patternSourceKind(b.parent), key);
    });

    const funcReturnKind = (f) => guard(f, () => {
      if (f.type) return asValue(typeKind(f.type));
      if (!f.body) return null;
      if (!ts.isBlock(f.body)) return exprKind(f.body);
      const rets = [];
      const walk = (n) => {
        if (n !== f && ts.isFunctionLike(n)) return;
        if (ts.isReturnStatement(n) && n.expression) rets.push(n.expression);
        ts.forEachChild(n, walk);
      };
      ts.forEachChild(f.body, walk);
      if (!rets.length) return null;
      const ks = rets.map(exprKind);
      return ks.every((k) => k === ks[0]) ? ks[0] : null;
    });

    const declKind = (d) => guard(d, () => {
      if (ts.isNamespaceImport(d) || ts.isImportClause(d)) return importDeclOf(d) ? MOD : null;
      if (ts.isImportEqualsDeclaration(d)) {
        const r = d.moduleReference;
        return ts.isExternalModuleReference(r) && isVscodeSpec(r.expression) ? MOD : null;
      }
      if (ts.isImportSpecifier(d)) {
        if (!importDeclOf(d)) return null;
        return (d.propertyName || d.name).text === "workspace" ? WS : null;
      }
      if (ts.isBindingElement(d)) return bindingKind(d);
      if (ts.isFunctionDeclaration(d) || ts.isMethodDeclaration(d) || ts.isGetAccessorDeclaration(d)) return null;
      if (ts.isVariableDeclaration(d) || ts.isParameter(d) || ts.isPropertyDeclaration(d) ||
        ts.isPropertySignature(d) || ts.isPropertyAssignment(d)) {
        if (d.type) return typeKind(d.type);
        return d.initializer ? exprKind(d.initializer) : null;
      }
      if (ts.isShorthandPropertyAssignment(d)) return exprKind(d.name);
      if (ts.isBinaryExpression(d) && d.operatorToken.kind === ts.SyntaxKind.EqualsToken) return exprKind(d.right);
      if (ts.isPropertyAccessExpression(d) && ts.isBinaryExpression(d.parent)) return exprKind(d.parent.right);
      return null;
    });

    const symKind = (sym) => {
      const decls = (sym && sym.declarations || []).filter((d) => d.getSourceFile() === sourceFile);
      for (const d of decls) {
        const k = declKind(d);
        if (k) return k;
      }
      return null;
    };
    const identKind = (id) => {
      if (id.text === "undefined") return null;
      return symKind(checker.getSymbolAtLocation(id));
    };
    const calleeFunctionDecls = (callee) => {
      const nameNode = ts.isPropertyAccessExpression(callee) ? callee.name : callee;
      const sym = checker.getSymbolAtLocation(nameNode);
      const out = [];
      for (const d of (sym && sym.declarations || [])) {
        if (d.getSourceFile() !== sourceFile) continue;
        if (ts.isFunctionLike(d) && !ts.isParameter(d)) out.push(d);
        else if ((ts.isVariableDeclaration(d) || ts.isPropertyDeclaration(d) || ts.isPropertyAssignment(d)) &&
          d.initializer && (ts.isArrowFunction(strip(d.initializer)) || ts.isFunctionExpression(strip(d.initializer))))
          out.push(strip(d.initializer));
      }
      return out;
    };

    const exprKind = (e0) => {
      const e = strip(e0);
      if (!e) return null;
      if (ts.isIdentifier(e)) return asValue(identKind(e));
      if (ts.isAwaitExpression(e)) return exprKind(e.expression);
      if (ts.isConditionalExpression(e)) {
        const a = exprKind(e.whenTrue), b = exprKind(e.whenFalse);
        return a && a === b ? a : null;
      }
      const name = memberName(e);
      if (name !== undefined) {
        // in-file member (e.g. this.cfg) takes precedence over structural vscode paths
        if (ts.isPropertyAccessExpression(e)) {
          const sym = checker.getSymbolAtLocation(e.name);
          const k = symKind(sym);
          if (k) return asValue(k);
        }
        return step(exprKind(e.expression), name);
      }
      if (ts.isCallExpression(e)) {
        const callee = strip(e.expression);
        if (callee.kind === ts.SyntaxKind.ImportKeyword) return isVscodeSpec(e.arguments[0]) ? MOD : null;
        if (ts.isIdentifier(callee) && callee.text === "require" && e.arguments.length === 1 &&
          isVscodeSpec(e.arguments[0])) {
          const s = checker.getSymbolAtLocation(callee);
          const local = (s && s.declarations || []).some((d) => d.getSourceFile() === sourceFile);
          return local ? null : MOD;
        }
        const fnDecls = calleeFunctionDecls(callee);
        if (fnDecls.length) {
          for (const f of fnDecls) {
            const k = funcReturnKind(f);
            if (k) return asValue(k);
          }
          return null;
        }
        return exprKind(callee) === GC ? CFG : null;
      }
      return null;
    };

    const isUndefinedArg = (a) => {
      const s = strip(a);
      return (ts.isIdentifier(s) && s.text === "undefined") || ts.isVoidExpression(s) || ts.isSpreadElement(s);
    };
    const assertedDirectly = (call) => {
      let p = call.parent;
      while (p && ts.isParenthesizedExpression(p)) p = p.parent;
      return !!p && (ts.isAsExpression(p) || ts.isTypeAssertionExpression(p) || ts.isNonNullExpression(p));
    };

    const visit = (n) => {
      if (ts.isCallExpression(n)) {
        const callee = strip(n.expression);
        if (memberName(callee) === "get" && exprKind(callee.expression) === CFG) {
          const args = n.arguments;
          const hasDefault = args.length >= 2 && !isUndefinedArg(args[1]) && !args.slice(0, 2).some(ts.isSpreadElement);
          const asserted = assertedDirectly(n);
          const ok = hasDefault && !asserted;
          if (!ok) bad += 1;
          const p = where(n);
          const why = ok ? "default+unasserted" : !hasDefault ? "no-default" : "asserted";
          ev.push({ line: p.line + 1, column: p.character + 1,
            node_kind: "CallExpression:WorkspaceConfiguration.get:" + why,
            text: n.getText(sourceFile).split("\n")[0] });
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sourceFile);
    if (ev.length === 0) return { outcome: "NOT_APPLICABLE", evidence: [] };
    return { outcome: bad ? "VIOLATED" : "SATISFIED", evidence: ev };
  },
};
