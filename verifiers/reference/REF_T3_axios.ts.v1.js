// Reference T3 (METHODOLOGY_1 §2 example): "Prefer axios over fetch." Governed construct: an
// HTTP call made through the platform `fetch` or through an import from "axios". Whether an
// identifier named `fetch` IS the platform fetch needs binding information: a local `fetch`
// (a wrapper, a parameter, an aliased axios method) is not, and `globalThis.fetch` or an
// aliased global is. The checker resolves the symbol; a declaration in a default-library file
// means the platform fetch. Axios calls are recognised by the import that binds their root.
module.exports = {
  tier: "T3",
  verify(ctx) {
    const { ts, sourceFile, checker, program } = ctx;
    const ev = [];
    let bad = 0;
    const where = (n) => sourceFile.getLineAndCharacterOfPosition(n.getStart(sourceFile));
    const isLib = (sym) => !!sym && (sym.declarations || []).some(
      (d) => program.isSourceFileDefaultLibrary(d.getSourceFile()));
    const resolve = (sym) => {
      // follow local aliases such as `const f = fetch` or `const { fetch: f } = globalThis`
      for (let i = 0; sym && i < 8; i++) {
        if (isLib(sym)) return sym;
        const d = (sym.declarations || [])[0];
        if (d && ts.isVariableDeclaration(d) && d.initializer && !d.type) {
          const init = d.initializer;
          const target = ts.isPropertyAccessExpression(init) ? init.name : init;
          sym = checker.getSymbolAtLocation(target);
        } else if (d && ts.isBindingElement(d)) {
          const name = d.propertyName || d.name;
          const t = checker.getTypeAtLocation(d.parent.parent.initializer || d);
          sym = ts.isIdentifier(name) ? t.getProperty(name.text) : undefined;
        } else {
          return sym;
        }
      }
      return sym;
    };
    const fromAxios = (id) => {
      const sym = checker.getSymbolAtLocation(id);
      return !!sym && (sym.declarations || []).some((d) => {
        let p = d;
        while (p && !ts.isImportDeclaration(p)) p = p.parent;
        return !!p && ts.isStringLiteral(p.moduleSpecifier) && p.moduleSpecifier.text === "axios";
      });
    };
    const root = (e) => {
      while (ts.isPropertyAccessExpression(e) || ts.isCallExpression(e)) e = e.expression;
      return ts.isIdentifier(e) ? e : undefined;
    };
    const visit = (n) => {
      if (ts.isCallExpression(n)) {
        const callee = n.expression;
        const nameNode = ts.isPropertyAccessExpression(callee) ? callee.name : callee;
        const sym = resolve(checker.getSymbolAtLocation(nameNode));
        const r = root(callee);
        if (sym && isLib(sym) && sym.getName() === "fetch") {
          bad += 1;
          const p = where(n);
          ev.push({ line: p.line + 1, column: p.character + 1, node_kind: "CallExpression:platform-fetch", text: n.getText(sourceFile).split("\n")[0] });
        } else if (r && fromAxios(r)) {
          const p = where(n);
          ev.push({ line: p.line + 1, column: p.character + 1, node_kind: "CallExpression:axios", text: n.getText(sourceFile).split("\n")[0] });
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sourceFile);
    if (ev.length === 0) return { outcome: "NOT_APPLICABLE", evidence: [] };
    return { outcome: bad ? "VIOLATED" : "SATISFIED", evidence: ev };
  },
};
