// R10_35 (T2): "Import Order: External dependencies (npm packages), Models (`@/models/`),
// Shared utilities (`@/shared/`), Module-specific imports (`@/modules/`), Relative imports
// (`./`, `../`)."
// Governed construct: the top-level static ImportDeclaration nodes of one file (including
// `import type`), classified by module specifier. Group rank must never decrease in source
// order. Comments, strings, dynamic import(), require() and export-from are not
// ImportDeclarations and are ignored by construction. Specifiers under other '@/' aliases, or
// absolute '/' paths, are unclassified and do not affect the verdict.
module.exports = {
  tier: "T2",
  verify(ctx) {
    const { ts, sourceFile } = ctx;
    const classify = (spec) => {
      if (spec.startsWith("@/")) {
        if (spec.startsWith("@/models/")) return [1, "models"];
        if (spec.startsWith("@/shared/")) return [2, "shared"];
        if (spec.startsWith("@/modules/")) return [3, "modules"];
        return [-1, "unclassified-alias"];
      }
      if (spec === "." || spec === ".." || spec.startsWith("./") || spec.startsWith("../")) {
        return [4, "relative"];
      }
      if (spec.startsWith(".") || spec.startsWith("/")) return [-1, "unclassified-path"];
      return [0, "external"];
    };
    const ev = [];
    let maxRank = -1;
    let maxGroup = "";
    let bad = 0;
    for (const st of sourceFile.statements) {
      if (!ts.isImportDeclaration(st)) continue;
      const m = st.moduleSpecifier;
      const spec = m && ts.isStringLiteral(m) ? m.text : "";
      const [rank, group] = classify(spec);
      const pos = sourceFile.getLineAndCharacterOfPosition(st.getStart(sourceFile));
      let verdict = "ok";
      if (rank >= 0) {
        if (rank < maxRank) {
          bad += 1;
          verdict = "out-of-order (" + group + " after " + maxGroup + ")";
        } else {
          maxRank = rank;
          maxGroup = group;
        }
      }
      ev.push({
        line: pos.line + 1,
        column: pos.character + 1,
        node_kind: ts.SyntaxKind[st.kind],
        text: "[" + group + "] " + verdict + ": " + st.getText(sourceFile).replace(/\s+/g, " "),
      });
    }
    if (ev.length === 0) return { outcome: "NOT_APPLICABLE", evidence: [] };
    return { outcome: bad ? "VIOLATED" : "SATISFIED", evidence: ev };
  },
};
