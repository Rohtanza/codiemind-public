// R67_10 (T2): "Absolute imports preferred over relative imports."
// Governed construct: one module specifier string in a module-loading construct:
//   - ImportDeclaration (incl. type-only and side-effect imports)
//   - ExportDeclaration with a module specifier (export ... from / export * from)
//   - ImportEqualsDeclaration with an external module reference (import x = require('...'))
//   - dynamic import('...') call with a string-literal first argument
//   - require('...') call with a string-literal first argument
//   - type-position import('...') (ImportTypeNode)
// A specifier violates iff it is '.' or '..' or starts with './' or '../'.
// Exact on the syntax tree: comments and ordinary string literals are not instances.
module.exports = {
  tier: "T2",
  verify(ctx) {
    const { ts, sourceFile } = ctx;
    const ev = [];
    let bad = 0;
    const REQ = "requ" + "ire";
    const isStr = (n) => !!n && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n));
    const isRelative = (s) =>
      s === "." || s === ".." || s.startsWith("./") || s.startsWith("../");
    const record = (owner, lit) => {
      const spec = lit.text;
      const pos = sourceFile.getLineAndCharacterOfPosition(lit.getStart(sourceFile));
      if (isRelative(spec)) bad += 1;
      ev.push({ line: pos.line + 1, column: pos.character + 1,
                node_kind: ts.SyntaxKind[owner.kind],
                text: (isRelative(spec) ? "relative: " : "non-relative: ") + JSON.stringify(spec) });
    };
    const visit = (n) => {
      if (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) {
        if (isStr(n.moduleSpecifier)) record(n, n.moduleSpecifier);
      } else if (ts.isImportEqualsDeclaration(n)) {
        const r = n.moduleReference;
        if (r && ts.isExternalModuleReference(r) && isStr(r.expression)) record(n, r.expression);
      } else if (ts.isCallExpression(n)) {
        const callee = n.expression;
        const first = n.arguments[0];
        if (isStr(first)) {
          if (callee.kind === ts.SyntaxKind.ImportKeyword) record(n, first);
          else if (ts.isIdentifier(callee) && callee.text === REQ) record(n, first);
        }
      } else if (ts.isImportTypeNode(n)) {
        const a = n.argument;
        if (a && ts.isLiteralTypeNode(a) && isStr(a.literal)) record(n, a.literal);
      }
      ts.forEachChild(n, visit);
    };
    visit(sourceFile);
    if (ev.length === 0) return { outcome: "NOT_APPLICABLE", evidence: [] };
    return { outcome: bad ? "VIOLATED" : "SATISFIED", evidence: ev };
  },
};
