// R64_10 (T3): "Always use explicit types; avoid any." Governed construct: every typed position
// in the unit — each parameter, each variable / binding / property / class-member declaration,
// each function return, each type alias, each type assertion, and each written `any` keyword.
// The verdict of a position is the type the TypeScript checker assigns to it: a position whose
// type is `any`, or contains `any` as a type argument / union member (`any[]`, `Promise<any>`,
// `Map<any, any>`), is VIOLATED, whether written or implicit (untyped parameter without a
// contextual type, `const x = JSON.parse(s)`). `unknown`, generics and contextually inferred
// non-any types conform. A syntax query cannot see inferred `any`, hence T3.
// Indeterminate positions: the checker's error type (an unresolved import's type in this
// one-file program) is not counted as `any`, and an inferred `any` that flows only from an
// unresolved import binding is skipped rather than judged — it says nothing about the author.
module.exports = {
  tier: "T3",
  verify(ctx) {
    const { ts, sourceFile, checker } = ctx;
    const ev = [];
    let bad = 0;
    const SK = ts.SyntaxKind;

    const record = (node, kind, isBad) => {
      const p = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      let text = node.getText(sourceFile).split("\n")[0].trim();
      if (text.length > 120) text = text.slice(0, 120);
      if (isBad) bad += 1;
      ev.push({ line: p.line + 1, column: p.character + 1,
        node_kind: kind + (isBad ? ":any" : ":typed"), text });
    };

    const isAnyFlag = (t) => !!t && (t.flags & ts.TypeFlags.Any) !== 0 && t.intrinsicName !== "error";

    const containsAny = (t, depth, seen) => {
      if (!t || depth > 5 || seen.has(t)) return false;
      seen.add(t);
      if (isAnyFlag(t)) return true;
      if (t.flags & ts.TypeFlags.UnionOrIntersection) {
        for (const m of t.types || []) if (containsAny(m, depth + 1, seen)) return true;
      }
      if ((t.flags & ts.TypeFlags.Object) && (t.objectFlags & ts.ObjectFlags.Reference)) {
        let args = [];
        try { args = checker.getTypeArguments(t) || []; } catch (e) { args = []; }
        for (const a of args) if (containsAny(a, depth + 1, seen)) return true;
      }
      for (const a of t.aliasTypeArguments || []) if (containsAny(a, depth + 1, seen)) return true;
      return false;
    };
    const hasAny = (t) => containsAny(t, 0, new Set());

    // Does an expression's value flow only from an import that this program cannot resolve?
    const fromUnresolved = (expr, depth) => {
      let e = expr;
      for (let i = 0; e && i < 40; i++) {
        if (ts.isParenthesizedExpression(e) || ts.isAwaitExpression(e) || ts.isNonNullExpression(e)
          || ts.isCallExpression(e) || ts.isNewExpression(e) || ts.isPropertyAccessExpression(e)
          || ts.isElementAccessExpression(e) || ts.isTaggedTemplateExpression(e)) {
          e = ts.isTaggedTemplateExpression(e) ? e.tag : e.expression;
        } else break;
      }
      if (!e || !ts.isIdentifier(e) || depth > 6) return false;
      const sym = checker.getSymbolAtLocation(e);
      if (!sym) return false;
      if (sym.flags & ts.SymbolFlags.Alias) {
        let target;
        try { target = checker.getAliasedSymbol(sym); } catch (err) { target = undefined; }
        return !target || !(target.declarations && target.declarations.length);
      }
      const d = (sym.declarations || [])[0];
      if (d && ts.isVariableDeclaration(d) && !d.type && d.initializer) return fromUnresolved(d.initializer, depth + 1);
      return false;
    };

    const declType = (node, nameNode) => {
      const sym = nameNode ? checker.getSymbolAtLocation(nameNode) : undefined;
      if (sym && !(sym.flags & ts.SymbolFlags.Alias)) {
        try { return checker.getTypeOfSymbolAtLocation(sym, nameNode); } catch (e) { /* fall through */ }
      }
      return checker.getTypeAtLocation(nameNode || node);
    };

    const paramUnresolved = (param) => {
      const fn = param.parent;
      let p = fn && fn.parent;
      while (p && ts.isParenthesizedExpression(p)) p = p.parent;
      if (p && (ts.isCallExpression(p) || ts.isNewExpression(p))) return fromUnresolved(p.expression, 0);
      return false;
    };

    const returnExprs = (fn) => {
      const out = [];
      if (!fn.body) return out;
      if (!ts.isBlock(fn.body)) { out.push(fn.body); return out; }
      const walk = (n) => {
        if (ts.isFunctionLike(n) || ts.isClassLike(n)) return;
        if (ts.isReturnStatement(n) && n.expression) out.push(n.expression);
        ts.forEachChild(n, walk);
      };
      ts.forEachChild(fn.body, walk);
      return out;
    };

    const isSignatureDecl = (n) => ts.isFunctionDeclaration(n) || ts.isMethodDeclaration(n)
      || ts.isArrowFunction(n) || ts.isFunctionExpression(n) || ts.isGetAccessorDeclaration(n)
      || ts.isMethodSignature(n) || ts.isCallSignatureDeclaration(n) || ts.isFunctionTypeNode(n)
      || ts.isConstructSignatureDeclaration(n) || ts.isIndexSignatureDeclaration(n)
      || ts.isConstructorTypeNode(n);

    const visit = (n) => {
      if (n.kind === SK.AnyKeyword) {
        record(n, "AnyKeyword", true);
      } else if (ts.isParameter(n)) {
        if (n.type) {
          record(n, "Parameter:annotated", hasAny(checker.getTypeFromTypeNode(n.type)));
        } else {
          const t = checker.getTypeAtLocation(n.name);
          const any = hasAny(t);
          if (!(any && paramUnresolved(n))) record(n, "Parameter:inferred", any);
        }
      } else if (ts.isVariableDeclaration(n) || ts.isPropertyDeclaration(n) || ts.isPropertySignature(n)) {
        if (n.type) {
          record(n, ts.SyntaxKind[n.kind] + ":annotated", hasAny(checker.getTypeFromTypeNode(n.type)));
        } else {
          const t = ts.isIdentifier(n.name) ? declType(n, n.name) : checker.getTypeAtLocation(n.name);
          const any = hasAny(t);
          const init = n.initializer;
          if (!(any && init && fromUnresolved(init, 0))) record(n, ts.SyntaxKind[n.kind] + ":inferred", any);
        }
      } else if (ts.isBindingElement(n)) {
        const t = checker.getTypeAtLocation(n.name);
        record(n, "BindingElement", hasAny(t));
      } else if (ts.isPropertyAssignment(n) || ts.isShorthandPropertyAssignment(n)) {
        const t = ts.isPropertyAssignment(n) ? checker.getTypeAtLocation(n.initializer) : checker.getTypeAtLocation(n.name);
        const any = hasAny(t);
        const src = ts.isPropertyAssignment(n) ? n.initializer : n.name;
        if (!(any && fromUnresolved(src, 0))) record(n, ts.SyntaxKind[n.kind], any);
      } else if (ts.isAsExpression(n) || ts.isTypeAssertionExpression(n)) {
        const isConst = ts.isTypeReferenceNode(n.type) && ts.isIdentifier(n.type.typeName) && n.type.typeName.text === "const";
        const t = isConst ? checker.getTypeAtLocation(n) : checker.getTypeFromTypeNode(n.type);
        record(n, ts.SyntaxKind[n.kind], hasAny(t));
      } else if (ts.isTypeAliasDeclaration(n)) {
        record(n, "TypeAliasDeclaration", hasAny(checker.getTypeFromTypeNode(n.type)));
      }

      if (isSignatureDecl(n)) {
        if (n.type) {
          record(n.type, "ReturnType:annotated", hasAny(checker.getTypeFromTypeNode(n.type)));
        } else if (!ts.isFunctionTypeNode(n) && !ts.isConstructorTypeNode(n)) {
          let t;
          try {
            const sig = checker.getSignatureFromDeclaration(n);
            t = sig ? checker.getReturnTypeOfSignature(sig) : undefined;
          } catch (e) { t = undefined; }
          if (t) {
            let any = hasAny(t);
            if (any) {
              const rs = returnExprs(n);
              if (rs.length && rs.every((r) => fromUnresolved(r, 0))) any = null;
            }
            if (any !== null) record(n.name || n, "ReturnType:inferred", any);
          }
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sourceFile);
    if (ev.length === 0) return { outcome: "NOT_APPLICABLE", evidence: [] };
    return { outcome: bad ? "VIOLATED" : "SATISFIED", evidence: ev };
  },
};
