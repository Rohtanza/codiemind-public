// R44_53 (T3): "Wrap client components in Suspense with fallback."
// Governed construct: a JSX element whose tag is bound (by symbol resolution, not by name) to a
// component created with React's lazy() or with the default export of "next/dynamic". It conforms
// when its nearest enclosing React Suspense element (bound to Suspense exported by "react", via a
// named import under any alias or React.Suspense on a default/namespace import) encloses it in
// its children and carries a fallback whose value is not null/undefined. A wrapper merely named
// Suspense but bound elsewhere does not count. Binding is resolved with the checker's symbols and
// followed through local aliases, destructuring and object-literal members.
module.exports = {
  tier: "T3",
  verify(ctx) {
    const { ts, sourceFile, checker } = ctx;
    const ev = [];
    let bad = 0;
    const where = (n) => sourceFile.getLineAndCharacterOfPosition(n.getStart(sourceFile));

    const strip = (e) => {
      while (e && (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) ||
        ts.isNonNullExpression(e) || ts.isTypeAssertionExpression(e) ||
        (ts.isSatisfiesExpression && ts.isSatisfiesExpression(e)))) e = e.expression;
      return e;
    };
    const importDeclOf = (d) => {
      let p = d;
      while (p && !ts.isImportDeclaration(p)) p = p.parent;
      return p && ts.isStringLiteral(p.moduleSpecifier) ? p : undefined;
    };
    const declOf = (node) => {
      const sym = checker.getSymbolAtLocation(node);
      return sym && sym.declarations && sym.declarations.length ? sym.declarations[0] : undefined;
    };

    // Is `e` the module object (namespace or default import) of module `mod`?
    const isModuleObj = (e, mod, depth) => {
      e = strip(e);
      if (!e || depth > 8 || !ts.isIdentifier(e)) return false;
      const d = declOf(e);
      if (!d) return false;
      if (ts.isNamespaceImport(d) || ts.isImportClause(d)) {
        const imp = importDeclOf(d);
        return !!imp && imp.moduleSpecifier.text === mod;
      }
      if (ts.isImportSpecifier(d)) {
        const imp = importDeclOf(d);
        return !!imp && imp.moduleSpecifier.text === mod &&
          (d.propertyName || d.name).text === "default";
      }
      if (ts.isVariableDeclaration(d) && ts.isIdentifier(d.name) && d.initializer) {
        return isModuleObj(d.initializer, mod, depth + 1);
      }
      return false;
    };

    // Does expression `e` refer to export `name` of module `mod`? ("default" = default export)
    const refersTo = (e, name, mod, depth) => {
      e = strip(e);
      if (!e || depth > 8) return false;
      if (ts.isPropertyAccessExpression(e)) {
        return e.name.text === name && isModuleObj(e.expression, mod, depth + 1);
      }
      if (ts.isElementAccessExpression(e)) {
        const a = e.argumentExpression;
        return !!a && ts.isStringLiteralLike(a) && a.text === name &&
          isModuleObj(e.expression, mod, depth + 1);
      }
      if (!ts.isIdentifier(e)) return false;
      const d = declOf(e);
      if (!d) return false;
      if (ts.isImportSpecifier(d)) {
        const imp = importDeclOf(d);
        return !!imp && imp.moduleSpecifier.text === mod && (d.propertyName || d.name).text === name;
      }
      if (ts.isImportClause(d)) {
        const imp = importDeclOf(d);
        return name === "default" && !!imp && imp.moduleSpecifier.text === mod;
      }
      if (ts.isBindingElement(d) && ts.isObjectBindingPattern(d.parent)) {
        const key = d.propertyName || d.name;
        const decl = d.parent.parent;
        return ts.isIdentifier(key) && key.text === name && ts.isVariableDeclaration(decl) &&
          !!decl.initializer && isModuleObj(decl.initializer, mod, depth + 1);
      }
      if (ts.isVariableDeclaration(d) && ts.isIdentifier(d.name) && d.initializer) {
        return refersTo(d.initializer, name, mod, depth + 1);
      }
      return false;
    };

    const isClientFactoryCall = (e) => {
      e = strip(e);
      if (!e || !ts.isCallExpression(e)) return false;
      return refersTo(e.expression, "lazy", "react", 0) ||
        refersTo(e.expression, "default", "next/dynamic", 0);
    };

    // Is the JSX tag bound to a lazy()/dynamic() component?
    const isClientTag = (tag) => {
      let target = tag;
      for (let i = 0; target && i < 8; i++) {
        const node = ts.isPropertyAccessExpression(target) ? target.name : target;
        const d = declOf(node);
        if (!d) return false;
        let init;
        if (ts.isVariableDeclaration(d) && ts.isIdentifier(d.name)) init = d.initializer;
        else if (ts.isPropertyAssignment(d)) init = d.initializer;
        else if (ts.isShorthandPropertyAssignment(d)) {
          const s = checker.getShorthandAssignmentValueSymbol(d);
          const sd = s && s.declarations && s.declarations[0];
          init = sd && ts.isVariableDeclaration(sd) ? sd.initializer : undefined;
        } else return false;
        if (!init) return false;
        if (isClientFactoryCall(init)) return true;
        init = strip(init);
        if (ts.isIdentifier(init) || ts.isPropertyAccessExpression(init)) target = init;
        else return false;
      }
      return false;
    };

    const isReactSuspense = (tag) => refersTo(tag, "Suspense", "react", 0);

    const isNullish = (e) => {
      e = strip(e);
      if (!e) return true; // empty expression `{}`
      if (e.kind === ts.SyntaxKind.NullKeyword) return true;
      if (ts.isVoidExpression(e)) return true;
      if (ts.isIdentifier(e) && e.text === "undefined") {
        const d = declOf(e);
        return !d || !d.getSourceFile || d.getSourceFile() !== sourceFile;
      }
      return false;
    };

    // fallback status of a Suspense opening element: "ok" | "missing" | "nullish"
    const fallbackStatus = (open) => {
      let status = "missing";
      for (const a of open.attributes.properties) {
        if (ts.isJsxAttribute(a) && ts.isIdentifier(a.name) && a.name.text === "fallback") {
          const init = a.initializer;
          if (!init) status = "ok"; // `fallback` shorthand = true
          else if (ts.isJsxExpression(init)) status = isNullish(init.expression) ? "nullish" : "ok";
          else status = "ok"; // string literal or JSX element
        } else if (ts.isJsxSpreadAttribute(a)) {
          const o = strip(a.expression);
          if (o && ts.isObjectLiteralExpression(o)) {
            for (const p of o.properties) {
              if (ts.isPropertyAssignment(p) && p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) &&
                p.name.text === "fallback") status = isNullish(p.initializer) ? "nullish" : "ok";
            }
          }
        }
      }
      return status;
    };

    // nearest enclosing React Suspense whose children contain `el`
    const nearestSuspense = (el) => {
      let child = el;
      let p = el.parent;
      while (p) {
        if (ts.isJsxElement(p) && child !== p.openingElement && child !== p.closingElement &&
          isReactSuspense(p.openingElement.tagName)) return p.openingElement;
        child = p;
        p = p.parent;
      }
      return undefined;
    };

    const visit = (n) => {
      if (ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) {
        if (isClientTag(n.tagName)) {
          const el = ts.isJsxOpeningElement(n) ? n.parent : n;
          const s = nearestSuspense(el);
          const pos = where(n);
          let kind;
          if (!s) { kind = "JsxElement:client-component:no-react-suspense"; bad += 1; }
          else {
            const st = fallbackStatus(s);
            if (st === "ok") kind = "JsxElement:client-component:suspense-with-fallback@" +
              (where(s).line + 1);
            else { kind = "JsxElement:client-component:suspense-fallback-" + st + "@" + (where(s).line + 1); bad += 1; }
          }
          ev.push({ line: pos.line + 1, column: pos.character + 1, node_kind: kind,
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
