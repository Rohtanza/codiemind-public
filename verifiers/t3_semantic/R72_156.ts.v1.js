// R72_156 (T3): "Avoid the `any` type; use `unknown` when type is uncertain."
// Governed construct: every typed position (variable, parameter, property, index signature,
// function/method return, type assertion, type argument, type-parameter default, type alias),
// whether its type is written or inferred. A position violates when the type the checker
// resolves for it is, or structurally contains, `any` (written `any` anywhere in a type node,
// or inferred, e.g. `const x = JSON.parse(s)`). Unresolved symbols (the checker's internal
// `error` type, e.g. from a module that is not in this single-file program) are not counted as
// `any`: they say nothing about what the author wrote. Comments/strings are never type nodes.
module.exports = {
  tier: "T3",
  verify(ctx) {
    const { ts, sourceFile, checker } = ctx;
    const ev = [];
    let bad = 0;
    const where = (n) => sourceFile.getLineAndCharacterOfPosition(n.getStart(sourceFile));
    const snippet = (n) => n.getText(sourceFile).split("\n")[0].slice(0, 160);

    const isAny = (t) => !!t && (t.flags & ts.TypeFlags.Any) !== 0 && t.intrinsicName !== "error";

    const containsAny = (t, depth, seen) => {
      if (!t) return false;
      if (isAny(t)) return true;
      if (depth > 4 || seen.has(t)) return false;
      seen.add(t);
      if (t.flags & ts.TypeFlags.UnionOrIntersection) {
        return (t.types || []).some((m) => containsAny(m, depth + 1, seen));
      }
      if (t.flags & ts.TypeFlags.Object) {
        const of = t.objectFlags || 0;
        if (of & ts.ObjectFlags.Reference) {
          const args = checker.getTypeArguments(t) || [];
          if (args.some((a) => containsAny(a, depth + 1, seen))) return true;
        }
        // Only descend structurally into anonymous / object-literal types: named interfaces and
        // classes from the default library (e.g. Response) are not the author's type positions.
        if (of & (ts.ObjectFlags.Anonymous | ts.ObjectFlags.ObjectLiteral)) {
          const sym = t.getSymbol && t.getSymbol();
          const decls = (sym && sym.declarations) || [];
          const local = decls.length === 0 || decls.some((d) => d.getSourceFile() === sourceFile);
          if (!local) return false;
          for (const p of t.getProperties()) {
            const d = p.valueDeclaration || (p.declarations || [])[0];
            if (!d) continue;
            if (containsAny(checker.getTypeOfSymbolAtLocation(p, d), depth + 1, seen)) return true;
          }
          for (const s of t.getCallSignatures().concat(t.getConstructSignatures())) {
            if (containsAny(s.getReturnType(), depth + 1, seen)) return true;
            for (const prm of s.getParameters()) {
              const d = prm.valueDeclaration || (prm.declarations || [])[0];
              if (d && containsAny(checker.getTypeOfSymbolAtLocation(prm, d), depth + 1, seen)) return true;
            }
          }
        }
      }
      return false;
    };

    const hasAnyKeyword = (n) => {
      if (!n) return false;
      if (n.kind === ts.SyntaxKind.AnyKeyword) return true;
      let found = false;
      ts.forEachChild(n, (c) => { if (!found && hasAnyKeyword(c)) found = true; });
      return found;
    };

    const record = (node, kind, violating) => {
      const p = where(node);
      if (violating) bad += 1;
      ev.push({ line: p.line + 1, column: p.character + 1,
        node_kind: kind + (violating ? ":any" : ":ok"), text: snippet(node) });
    };

    const typeOf = (n) => { try { return checker.getTypeAtLocation(n); } catch (e) { return undefined; } };
    const fromNode = (tn) => { try { return checker.getTypeFromTypeNode(tn); } catch (e) { return undefined; } };

    const checkTypeNode = (owner, tn, kind) => {
      record(owner, kind, hasAnyKeyword(tn) || containsAny(fromNode(tn), 0, new Set()));
    };

    const checkDeclared = (decl, nameNode, kind) => {
      if (decl.type) {
        record(decl, kind, hasAnyKeyword(decl.type) || containsAny(fromNode(decl.type), 0, new Set()));
      } else {
        record(decl, kind, containsAny(typeOf(nameNode), 0, new Set()));
      }
    };

    const isFunctionLike = (n) => ts.isFunctionDeclaration(n) || ts.isMethodDeclaration(n) ||
      ts.isArrowFunction(n) || ts.isFunctionExpression(n) || ts.isGetAccessorDeclaration(n) ||
      ts.isMethodSignature(n) || ts.isCallSignatureDeclaration(n) || ts.isConstructSignatureDeclaration(n) ||
      ts.isFunctionTypeNode(n);

    const visit = (n) => {
      if (ts.isVariableDeclaration(n)) {
        if (ts.isIdentifier(n.name)) checkDeclared(n, n.name, "VariableDeclaration");
        else if (n.type) checkTypeNode(n, n.type, "VariableDeclaration");
      } else if (ts.isBindingElement(n)) {
        if (ts.isIdentifier(n.name)) record(n, "BindingElement", containsAny(typeOf(n.name), 0, new Set()));
      } else if (ts.isParameter(n)) {
        if (ts.isIdentifier(n.name)) checkDeclared(n, n.name, "Parameter");
        else if (n.type) checkTypeNode(n, n.type, "Parameter");
      } else if (ts.isPropertyDeclaration(n) || ts.isPropertySignature(n)) {
        checkDeclared(n, n.name, ts.SyntaxKind[n.kind]);
      } else if (ts.isIndexSignatureDeclaration(n)) {
        checkTypeNode(n, n.type, "IndexSignature");
      } else if (ts.isAsExpression(n) || ts.isTypeAssertionExpression(n)) {
        if (!(ts.isTypeReferenceNode(n.type) && ts.isIdentifier(n.type.typeName) && n.type.typeName.text === "const")) {
          checkTypeNode(n, n.type, ts.SyntaxKind[n.kind]);
        }
      } else if (ts.isSatisfiesExpression && ts.isSatisfiesExpression(n)) {
        checkTypeNode(n, n.type, "SatisfiesExpression");
      } else if (ts.isTypeParameterDeclaration(n)) {
        if (n.default) checkTypeNode(n, n.default, "TypeParameterDefault");
        if (n.constraint) checkTypeNode(n, n.constraint, "TypeParameterConstraint");
      } else if (ts.isTypeAliasDeclaration(n)) {
        checkTypeNode(n, n.type, "TypeAliasDeclaration");
      }

      if (isFunctionLike(n)) {
        const kind = ts.SyntaxKind[n.kind] + ":return";
        if (n.type) {
          checkTypeNode(n, n.type, kind);
        } else if (!ts.isFunctionTypeNode(n)) {
          let rt;
          try {
            const sig = checker.getSignatureFromDeclaration(n);
            rt = sig && checker.getReturnTypeOfSignature(sig);
          } catch (e) { rt = undefined; }
          record(n, kind, containsAny(rt, 0, new Set()));
        }
      }

      if (n.typeArguments && n.typeArguments.length &&
          (ts.isCallExpression(n) || ts.isNewExpression(n) || ts.isTypeReferenceNode(n) ||
           ts.isExpressionWithTypeArguments(n) || ts.isTaggedTemplateExpression(n))) {
        for (const a of n.typeArguments) checkTypeNode(a, a, "TypeArgument");
      }

      // Any written `any` keyword not already inside a position above still violates.
      if (n.kind === ts.SyntaxKind.AnyKeyword) {
        let p = n.parent, covered = false;
        while (p) {
          if (ts.isVariableDeclaration(p) || ts.isParameter(p) || ts.isPropertyDeclaration(p) ||
              ts.isPropertySignature(p) || ts.isIndexSignatureDeclaration(p) || ts.isAsExpression(p) ||
              ts.isTypeAssertionExpression(p) || ts.isTypeParameterDeclaration(p) ||
              ts.isTypeAliasDeclaration(p) || isFunctionLike(p) ||
              (ts.isSatisfiesExpression && ts.isSatisfiesExpression(p))) { covered = true; break; }
          if (p.typeArguments && p.typeArguments.length) { covered = true; break; }
          p = p.parent;
        }
        if (!covered) record(n, "AnyKeyword", true);
      }
      ts.forEachChild(n, visit);
    };
    visit(sourceFile);
    if (ev.length === 0) return { outcome: "NOT_APPLICABLE", evidence: [] };
    return { outcome: bad ? "VIOLATED" : "SATISFIED", evidence: ev };
  },
};
