// R74_228 (T3): "Optimize images with next/image." Governed construct: a JSX element that renders
// an image, i.e. an intrinsic <img>, or a component element whose tag identifier is bound (via
// the checker, following local aliases) to an imported image component. Conforms iff the tag
// resolves to the default export of "next/image" under any local name. An intrinsic <img> or an
// image component imported from any other module (react-bootstrap/Image, antd Image, ...) is a
// violation, regardless of its local name. Tags bound to local declarations that are not
// aliases of an import are not image instances (their own JSX bodies are checked separately).
module.exports = {
  tier: "T3",
  verify(ctx) {
    const { ts, sourceFile, checker } = ctx;
    const ev = [];
    let bad = 0;
    const where = (n) => sourceFile.getLineAndCharacterOfPosition(n.getStart(sourceFile));
    const NEXT = "next/image";
    const IMG_NAME = /^(image|img|picture|lazyimage|lazyloadimage|optimizedimage|responsiveimage)$/i;
    const IMG_MOD = /(^|[\/\-_.@])(image|img|images|picture)s?([\/\-_.]|$)/i;

    // Resolve an identifier to its import binding, following `const X = Y` / `const X = ns.Y`.
    // Returns { module, imported } where imported is "default", "*" or the exported name.
    const importOf = (id) => {
      let sym = checker.getSymbolAtLocation(id);
      let member = null; // property name accessed on a namespace/default import
      for (let i = 0; sym && i < 8; i++) {
        const d = (sym.declarations || [])[0];
        if (!d) return null;
        if (ts.isImportClause(d) || ts.isImportSpecifier(d) || ts.isNamespaceImport(d)) {
          let p = d;
          while (p && !ts.isImportDeclaration(p)) p = p.parent;
          if (!p || !ts.isStringLiteral(p.moduleSpecifier)) return null;
          let imported;
          if (ts.isImportClause(d)) imported = "default";
          else if (ts.isNamespaceImport(d)) imported = "*";
          else imported = (d.propertyName || d.name).text;
          return { module: p.moduleSpecifier.text, imported, member };
        }
        if (ts.isImportEqualsDeclaration(d) && ts.isExternalModuleReference(d.moduleReference)
            && ts.isStringLiteral(d.moduleReference.expression)) {
          return { module: d.moduleReference.expression.text, imported: "*", member };
        }
        if (ts.isVariableDeclaration(d) && d.initializer && ts.isIdentifier(d.name)) {
          let init = d.initializer;
          while (ts.isParenthesizedExpression(init) || ts.isAsExpression(init)) init = init.expression;
          if (ts.isIdentifier(init)) { sym = checker.getSymbolAtLocation(init); continue; }
          if (ts.isPropertyAccessExpression(init) && ts.isIdentifier(init.expression) && member === null) {
            member = init.name.text;
            sym = checker.getSymbolAtLocation(init.expression);
            continue;
          }
          return null;
        }
        if (ts.isBindingElement(d) && ts.isObjectBindingPattern(d.parent) && member === null) {
          const vd = d.parent.parent;
          const nm = d.propertyName || d.name;
          if (ts.isVariableDeclaration(vd) && vd.initializer && ts.isIdentifier(vd.initializer) && ts.isIdentifier(nm)) {
            member = nm.text;
            sym = checker.getSymbolAtLocation(vd.initializer);
            continue;
          }
          return null;
        }
        return null;
      }
      return null;
    };

    // Classify a binding: "next" (conforming), "other" (non-Next image component), or null.
    const classify = (b) => {
      if (!b) return null;
      const mod = b.module;
      // effective exported name after member access
      let name = b.imported;
      if (b.member !== null) {
        if (b.imported === "*") name = b.member;
        else name = b.member; // property of a default/named export, e.g. Lib.Image
      }
      if (mod === NEXT) {
        if (name === "default") return "next";
        if (b.imported === "*" && b.member === null) return null;
        return null; // e.g. getImageProps: not a component element
      }
      if (name === "default" || name === "*") {
        const seg = mod.split("/").pop() || mod;
        if (IMG_NAME.test(seg) || IMG_MOD.test(mod)) return "other";
        return null;
      }
      if (IMG_NAME.test(name) || /Image$/.test(name)) return "other";
      return null;
    };

    const visit = (n) => {
      if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) {
        const tag = n.tagName;
        const p = where(n);
        const text = n.getText(sourceFile).split("\n")[0];
        const kind = ts.isJsxSelfClosingElement(n) ? "JsxSelfClosingElement" : "JsxOpeningElement";
        if (ts.isIdentifier(tag) && tag.text === "img") {
          bad += 1;
          ev.push({ line: p.line + 1, column: p.character + 1, node_kind: kind + ":intrinsic-img", text });
        } else {
          let b = null;
          if (ts.isIdentifier(tag) && /^[A-Z_$]/.test(tag.text)) {
            b = importOf(tag);
          } else if (ts.isPropertyAccessExpression(tag) && ts.isIdentifier(tag.expression)) {
            const base = importOf(tag.expression);
            if (base && base.member === null) b = { module: base.module, imported: base.imported, member: tag.name.text };
          }
          const c = classify(b);
          if (c === "next") {
            ev.push({ line: p.line + 1, column: p.character + 1, node_kind: kind + ":next/image", text });
          } else if (c === "other") {
            bad += 1;
            ev.push({ line: p.line + 1, column: p.character + 1, node_kind: kind + ":non-next-image(" + b.module + ")", text });
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
