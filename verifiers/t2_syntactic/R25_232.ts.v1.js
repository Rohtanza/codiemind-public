// R25_232 (T2): "Use absolute imports with path mapping when possible."
// Governed construct: the string-literal module specifier of an ImportDeclaration (incl. import
// type), ExportDeclaration with a from-clause, ImportEqualsDeclaration with require(), a type-level
// import('...') (ImportTypeNode), a dynamic import() call, or a require() call -- when that
// specifier names a project-local module: relative ('.', './', '..', '../') or a path-mapped alias
// ('@/...', '~/...'). Bare package specifiers are not instances.
// Conformance: an alias conforms; a same-directory './' sibling is tolerated; any relative
// specifier that climbs into a parent directory (a '..' segment) is VIOLATED, since an alias is
// possible there. Syntax-tree query: comments and ordinary string literals cannot fool it.
module.exports = {
  tier: "T2",
  verify(ctx) {
    const { ts, sourceFile } = ctx;
    const ev = [];
    let bad = 0;

    const isRelative = (s) => s === "." || s === ".." || s.startsWith("./") || s.startsWith("../");
    const isAlias = (s) => s.startsWith("@/") || s.startsWith("~/");
    const climbs = (s) => s.split("/").some((seg) => seg === "..");

    const lit = (e) =>
      e && (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) ? e : null;

    const record = (specNode, ownerKind) => {
      const s = specNode.text;
      if (!isRelative(s) && !isAlias(s)) return;
      const pos = sourceFile.getLineAndCharacterOfPosition(specNode.getStart(sourceFile));
      const violates = isRelative(s) && climbs(s);
      if (violates) bad += 1;
      ev.push({ line: pos.line + 1, column: pos.character + 1,
                node_kind: ownerKind + (violates ? ":parent-relative" : isAlias(s) ? ":alias" : ":sibling-relative"),
                text: s });
    };

    const visit = (n) => {
      if (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) {
        const m = lit(n.moduleSpecifier);
        if (m) record(m, ts.SyntaxKind[n.kind]);
      } else if (ts.isImportEqualsDeclaration(n)) {
        const r = n.moduleReference;
        if (ts.isExternalModuleReference(r)) {
          const m = lit(r.expression);
          if (m) record(m, "ImportEqualsDeclaration");
        }
      } else if (ts.isImportTypeNode(n)) {
        const a = n.argument;
        if (a && ts.isLiteralTypeNode(a)) {
          const m = lit(a.literal);
          if (m) record(m, "ImportTypeNode");
        }
      } else if (ts.isCallExpression(n) && n.arguments.length >= 1) {
        const callee = n.expression;
        const isDyn = callee.kind === ts.SyntaxKind.ImportKeyword;
        const isReq = ts.isIdentifier(callee) && callee.text === "require";
        if (isDyn || isReq) {
          const m = lit(n.arguments[0]);
          if (m) record(m, isDyn ? "CallExpression(import)" : "CallExpression(require)");
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sourceFile);

    if (ev.length === 0) return { outcome: "NOT_APPLICABLE", evidence: [] };
    return { outcome: bad ? "VIOLATED" : "SATISFIED", evidence: ev };
  },
};
