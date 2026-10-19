// R44_79 (T3): "Utilize Gatsby's Link component for internal navigation to ensure preloading of
// linked pages." Governed construct: a JSX element that navigates to an internal route, i.e.
//   - an intrinsic <a> whose href is an internal path (literal, template literal, or an
//     expression whose type is a string literal type), or
//   - a non-intrinsic element with a `to` prop (internal path or dynamic expression), or with an
//     `href` prop whose value is an internal path (or dynamic, when the tag name contains "link").
// Internal = not empty, not a fragment ('#...'), not protocol-relative ('//'), no URI scheme.
// An instance conforms only if its tag resolves, by import binding (checker symbol, following
// local `const X = Link` aliases), to the `Link` export of the "gatsby" package: named import,
// aliased named import, or `ns.Link` on a namespace import of "gatsby". Whether a tag named
// `Link` is Gatsby's needs binding information, hence T3.
module.exports = {
  tier: "T3",
  verify(ctx) {
    const { ts, sourceFile, checker } = ctx;
    const ev = [];
    let bad = 0;
    const where = (n) => sourceFile.getLineAndCharacterOfPosition(n.getStart(sourceFile));

    // ---- classify a path string: "internal" | "external" | "none"
    const classify = (s) => {
      const t = s.trim();
      if (t === "") return "none";
      if (t[0] === "#") return "none";
      if (t.slice(0, 2) === "//") return "external";
      if (/^[A-Za-z][A-Za-z0-9+.\-]*:/.test(t)) return "external";
      return "internal";
    };

    // ---- classify an attribute value: "internal" | "external" | "none" | "dynamic"
    const attrValue = (attr) => {
      const init = attr.initializer;
      if (!init) return "none";
      if (ts.isStringLiteral(init)) return classify(init.text);
      if (!ts.isJsxExpression(init) || !init.expression) return "none";
      let e = init.expression;
      while (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isNonNullExpression(e)
        || (ts.isSatisfiesExpression && ts.isSatisfiesExpression(e))) e = e.expression;
      if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return classify(e.text);
      if (ts.isTemplateExpression(e)) {
        if (e.head.text === "") return "dynamic";
        return classify(e.head.text);
      }
      const ty = checker.getTypeAtLocation(e);
      if (ty && ty.isStringLiteral && ty.isStringLiteral()) return classify(ty.value);
      return "dynamic";
    };

    // ---- import-binding resolution
    const importOf = (d) => {
      let p = d;
      while (p && !ts.isImportDeclaration(p)) p = p.parent;
      return p && ts.isStringLiteral(p.moduleSpecifier) ? p : undefined;
    };
    const fromGatsby = (d) => { const imp = importOf(d); return !!imp && imp.moduleSpecifier.text === "gatsby"; };

    // Is `node` (Identifier or PropertyAccessExpression) bound to gatsby's Link?
    const isGatsbyLink = (node, depth) => {
      if (depth > 8) return false;
      if (ts.isPropertyAccessExpression(node)) {
        if (node.name.text !== "Link") return false;
        const obj = node.expression;
        if (!ts.isIdentifier(obj)) return false;
        const sym = checker.getSymbolAtLocation(obj);
        return !!sym && (sym.declarations || []).some((d) =>
          (ts.isNamespaceImport(d) || ts.isImportClause(d)) && fromGatsby(d));
      }
      if (!ts.isIdentifier(node)) return false;
      const sym = checker.getSymbolAtLocation(node);
      if (!sym) return false;
      for (const d of sym.declarations || []) {
        if (ts.isImportSpecifier(d)) {
          const imported = (d.propertyName || d.name).text;
          if (imported === "Link" && fromGatsby(d)) return true;
        } else if (ts.isVariableDeclaration(d) && ts.isIdentifier(d.name) && d.initializer) {
          let init = d.initializer;
          while (ts.isParenthesizedExpression(init) || ts.isAsExpression(init)) init = init.expression;
          if ((ts.isIdentifier(init) || ts.isPropertyAccessExpression(init)) && isGatsbyLink(init, depth + 1)) return true;
        } else if (ts.isBindingElement(d) && ts.isObjectBindingPattern(d.parent)) {
          // const { Link: L } = Gatsby  (namespace import of gatsby)
          const key = d.propertyName || d.name;
          const decl = d.parent.parent;
          if (ts.isIdentifier(key) && key.text === "Link" && ts.isVariableDeclaration(decl)
            && decl.initializer && ts.isIdentifier(decl.initializer)) {
            const s2 = checker.getSymbolAtLocation(decl.initializer);
            if (s2 && (s2.declarations || []).some((x) => ts.isNamespaceImport(x) && fromGatsby(x))) return true;
          }
        }
      }
      return false;
    };

    const record = (el, tagText, conforms, kind) => {
      const p = where(el);
      if (!conforms) bad += 1;
      ev.push({ line: p.line + 1, column: p.character + 1,
        node_kind: kind + (conforms ? ":gatsby-Link" : ":non-gatsby"),
        text: el.getText(sourceFile).split("\n")[0].slice(0, 200) });
    };

    const check = (el) => {
      const tag = el.tagName;
      const attrs = el.attributes.properties.filter((a) => ts.isJsxAttribute(a) && ts.isIdentifier(a.name));
      const get = (name) => attrs.find((a) => a.name.text === name);
      const intrinsic = ts.isIdentifier(tag) && /^[a-z]/.test(tag.text) && tag.text.indexOf("-") < 0;
      if (intrinsic) {
        if (tag.text !== "a") return;
        const href = get("href");
        if (!href) return;
        if (attrValue(href) === "internal") record(el, "a", false, "JsxElement:a");
        return;
      }
      if (!(ts.isIdentifier(tag) || ts.isPropertyAccessExpression(tag))) return;
      const tagName = ts.isIdentifier(tag) ? tag.text : tag.name.text;
      const to = get("to");
      const href = get("href");
      let governed = false;
      if (to) { const v = attrValue(to); governed = v === "internal" || v === "dynamic"; }
      if (!governed && href) {
        const v = attrValue(href);
        governed = v === "internal" || (v === "dynamic" && /link/i.test(tagName));
      }
      if (!governed) return;
      record(el, tagName, isGatsbyLink(tag, 0), "JsxElement:" + tagName);
    };

    const visit = (n) => {
      if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) check(n);
      ts.forEachChild(n, visit);
    };
    visit(sourceFile);
    if (ev.length === 0) return { outcome: "NOT_APPLICABLE", evidence: [] };
    return { outcome: bad ? "VIOLATED" : "SATISFIED", evidence: ev };
  },
};
