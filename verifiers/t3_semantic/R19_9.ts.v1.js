// R19_9 (T3): "Avoid using `any` type - use proper typing instead."
// Governed construct: every typed position in the unit -- declared bindings (variables,
// parameters, properties, binding elements), function/method/accessor return types, type
// aliases, type assertions (`as` / `<T>` / `satisfies`), explicit type arguments, and
// type-parameter defaults/constraints. A position conforms when the type the checker resolves
// for it is not `any` and does not contain `any` as a component (union/intersection member,
// generic or alias type argument, array/tuple element, index-signature value). Implicit any
// (an unannotated, non-contextually-typed parameter) and `any` reached through other types
// (e.g. `ReturnType<typeof JSON.parse>`) are caught by the checker; an explicit `any` keyword
// anywhere in a type node is caught syntactically as well. Comments/strings are never examined.
// The checker's error type (unresolved names/modules) is not treated as `any`.
// Members of named/anonymous object types are not explored structurally: members declared in
// this unit are their own positions, and library internals are not the unit's typing.
module.exports = {
  tier: "T3",
  verify(ctx) {
    const { ts, sourceFile, checker } = ctx;
    const ev = [];
    let bad = 0;
    const where = (n) => sourceFile.getLineAndCharacterOfPosition(n.getStart(sourceFile));

    const isAny = (t) => !!(t.flags & ts.TypeFlags.Any) && t.intrinsicName !== "error";

    const containsAny = (t, seen, depth) => {
      if (!t || depth > 12 || seen.has(t)) return false;
      seen.add(t);
      if (isAny(t)) return true;
      if (t.aliasTypeArguments && t.aliasTypeArguments.some((a) => containsAny(a, seen, depth + 1))) return true;
      if (t.flags & ts.TypeFlags.UnionOrIntersection) {
        return t.types.some((u) => containsAny(u, seen, depth + 1));
      }
      if (t.flags & ts.TypeFlags.Object) {
        const of = t.objectFlags || 0;
        if (of & ts.ObjectFlags.Reference) {
          const args = checker.getTypeArguments(t) || [];
          if (args.some((a) => containsAny(a, seen, depth + 1))) return true;
        }
        if (of & (ts.ObjectFlags.Mapped | ts.ObjectFlags.Anonymous)) {
          const infos = checker.getIndexInfosOfType(t) || [];
          if (infos.some((i) => containsAny(i.type, seen, depth + 1))) return true;
        }
      }
      return false;
    };

    const hasAnyKeyword = (node) => {
      if (!node) return null;
      let found = null;
      const walk = (n) => {
        if (found) return;
        if (n.kind === ts.SyntaxKind.AnyKeyword) { found = n; return; }
        ts.forEachChild(n, walk);
      };
      walk(node);
      return found;
    };

    const record = (node, kind, type, typeNode) => {
      const p = where(node);
      let violating = false;
      try { violating = !!type && containsAny(type, new Set(), 0); } catch (e) { violating = false; }
      if (!violating && typeNode && hasAnyKeyword(typeNode)) violating = true;
      if (violating) bad += 1;
      let shown = "";
      try { shown = type ? checker.typeToString(type) : ""; } catch (e) { shown = ""; }
      ev.push({
        line: p.line + 1,
        column: p.character + 1,
        node_kind: kind + (violating ? ":any" : ":typed"),
        text: (node.getText(sourceFile).split("\n")[0] + (shown ? "  /* " + shown + " */" : "")).slice(0, 200),
      });
    };

    const typeAt = (n) => { try { return checker.getTypeAtLocation(n); } catch (e) { return undefined; } };
    const fromNode = (tn) => { try { return checker.getTypeFromTypeNode(tn); } catch (e) { return undefined; } };

    const isFunctionLike = (n) =>
      ts.isFunctionDeclaration(n) || ts.isMethodDeclaration(n) || ts.isArrowFunction(n) ||
      ts.isFunctionExpression(n) || ts.isGetAccessorDeclaration(n) || ts.isMethodSignature(n) ||
      ts.isCallSignatureDeclaration(n) || ts.isConstructSignatureDeclaration(n) ||
      ts.isFunctionTypeNode(n) || ts.isConstructorTypeNode(n) || ts.isIndexSignatureDeclaration(n);

    const visit = (n) => {
      if (ts.isVariableDeclaration(n) || ts.isPropertyDeclaration(n) || ts.isPropertySignature(n) ||
          ts.isParameter(n)) {
        if (ts.isIdentifier(n.name) || ts.isPrivateIdentifier(n.name) || ts.isStringLiteral(n.name) ||
            ts.isNumericLiteral(n.name) || ts.isComputedPropertyName(n.name)) {
          const target = ts.isComputedPropertyName(n.name) ? n : n.name;
          const isThisParam = ts.isParameter(n) && ts.isIdentifier(n.name) && n.name.text === "this";
          const t = n.type ? fromNode(n.type) : typeAt(target);
          record(n, isThisParam ? "ThisParameter" : ts.SyntaxKind[n.kind], t, n.type);
        } else {
          // destructuring pattern: the pattern's annotation (if any) is a position; each
          // binding element is its own position below
          if (n.type) record(n, ts.SyntaxKind[n.kind] + ":pattern", fromNode(n.type), n.type);
        }
      } else if (ts.isBindingElement(n) && ts.isIdentifier(n.name)) {
        record(n, "BindingElement", typeAt(n.name), undefined);
      } else if (ts.isTypeAliasDeclaration(n)) {
        record(n, "TypeAliasDeclaration", typeAt(n.name), n.type);
      } else if (ts.isAsExpression(n) || ts.isTypeAssertionExpression(n) || ts.isSatisfiesExpression(n)) {
        if (!(n.type.kind === ts.SyntaxKind.TypeReference && n.type.typeName.getText(sourceFile) === "const")) {
          record(n.type, ts.SyntaxKind[n.kind], fromNode(n.type), n.type);
        }
      } else if (ts.isTypeParameterDeclaration(n)) {
        if (n.default) record(n.default, "TypeParameterDefault", fromNode(n.default), n.default);
        if (n.constraint) record(n.constraint, "TypeParameterConstraint", fromNode(n.constraint), n.constraint);
      }

      // explicit type arguments on calls, `new`, tagged templates, heritage clauses, JSX
      if ((ts.isCallExpression(n) || ts.isNewExpression(n) || ts.isTaggedTemplateExpression(n) ||
           ts.isExpressionWithTypeArguments(n)) && n.typeArguments) {
        for (const a of n.typeArguments) record(a, "TypeArgument", fromNode(a), a);
      }

      // return positions of functions and signatures (declared or inferred)
      if (isFunctionLike(n) && !ts.isIndexSignatureDeclaration(n)) {
        let rt;
        if (n.type) rt = fromNode(n.type);
        else {
          try {
            const sig = checker.getSignatureFromDeclaration(n);
            rt = sig ? checker.getReturnTypeOfSignature(sig) : undefined;
          } catch (e) { rt = undefined; }
        }
        record(n.type || n.name || n, "ReturnType", rt, n.type);
      } else if (ts.isIndexSignatureDeclaration(n) && n.type) {
        record(n, "IndexSignature", fromNode(n.type), n.type);
      }

      ts.forEachChild(n, visit);
    };
    visit(sourceFile);

    // any `any` keyword not already inside an examined position (e.g. `implements Foo<any>`
    // without type-argument recording, or a mapped-type template) still violates
    const kw = [];
    const scan = (n) => {
      if (n.kind === ts.SyntaxKind.AnyKeyword) kw.push(n);
      ts.forEachChild(n, scan);
    };
    scan(sourceFile);
    if (kw.length && bad === 0) {
      for (const k of kw) {
        bad += 1;
        const p = where(k);
        ev.push({ line: p.line + 1, column: p.character + 1, node_kind: "AnyKeyword:any", text: k.parent.getText(sourceFile).split("\n")[0].slice(0, 200) });
      }
    }

    if (ev.length === 0) return { outcome: "NOT_APPLICABLE", evidence: [] };
    return { outcome: bad ? "VIOLATED" : "SATISFIED", evidence: ev };
  },
};
