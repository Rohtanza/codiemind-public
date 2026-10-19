// R57_143 (T2): "Do NOT use bare specifiers when importing dependencies; external dependencies
// must be prefixed with `npm:` or `jsr:`."
// Governed construct: a module specifier string literal naming an external module, found in
// an ImportDeclaration (incl. `import type`), an ExportDeclaration with `from`, a dynamic
// `import()` call, an `import x = require()` reference, a `require()` call, or an
// `import("x")` type node. Local specifiers (`./`, `../`, `/`, `.`, `..`) are not instances.
// Conforming: `npm:` or `jsr:` prefix; `node:` built-ins and URL specifiers (`scheme://`) are
// not bare and also conform. Non-literal dynamic specifiers cannot be judged and are skipped.
// Exact on the syntax tree: comments and ordinary string literals cannot fool it.
module.exports = {
  tier: "T2",
  verify(ctx) {
    const { ts, sourceFile } = ctx;
    const ev = [];
    let bad = 0;

    const isLocal = (s) =>
      s === "." || s === ".." || s.startsWith("./") || s.startsWith("../") || s.startsWith("/");
    const conforms = (s) =>
      s.startsWith("npm:") || s.startsWith("jsr:") || s.startsWith("node:") ||
      /^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(s);

    const record = (lit, kind) => {
      if (!lit || !(ts.isStringLiteral(lit) || ts.isNoSubstitutionTemplateLiteral(lit))) return;
      const s = lit.text;
      if (isLocal(s)) return;
      const ok = conforms(s);
      if (!ok) bad += 1;
      const pos = sourceFile.getLineAndCharacterOfPosition(lit.getStart(sourceFile));
      ev.push({ line: pos.line + 1, column: pos.character + 1,
                node_kind: kind, text: (ok ? "" : "bare specifier: ") + lit.getText(sourceFile) });
    };

    const visit = (n) => {
      if (ts.isImportDeclaration(n)) {
        record(n.moduleSpecifier, "ImportDeclaration");
      } else if (ts.isExportDeclaration(n) && n.moduleSpecifier) {
        record(n.moduleSpecifier, "ExportDeclaration");
      } else if (ts.isImportEqualsDeclaration(n) && ts.isExternalModuleReference(n.moduleReference)) {
        record(n.moduleReference.expression, "ImportEqualsDeclaration");
      } else if (ts.isCallExpression(n) && n.arguments.length >= 1) {
        if (n.expression.kind === ts.SyntaxKind.ImportKeyword) {
          record(n.arguments[0], "ImportCall");
        } else if (ts.isIdentifier(n.expression) && n.expression.text === "require") {
          record(n.arguments[0], "RequireCall");
        }
      } else if (ts.isImportTypeNode(n) && ts.isLiteralTypeNode(n.argument)) {
        record(n.argument.literal, "ImportType");
      }
      ts.forEachChild(n, visit);
    };
    visit(sourceFile);

    if (ev.length === 0) return { outcome: "NOT_APPLICABLE", evidence: [] };
    return { outcome: bad ? "VIOLATED" : "SATISFIED", evidence: ev };
  },
};
