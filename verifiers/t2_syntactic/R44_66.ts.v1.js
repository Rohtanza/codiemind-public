// R44_66 (T2): "Favor named exports for components and utilities."
// Governed construct: every module-level export statement of the source file
// (export-modified declarations, export { .. } [from], export * [as ns] from,
// export default <decl|expr>, export = expr). A default export in any form
// (default modifier, ExportAssignment, an export specifier or namespace export
// whose exported name is `default`) is VIOLATED; any other export conforms.
// No export statement at all => NOT_APPLICABLE. Syntax-tree based, so mentions
// of "export default" in comments or strings are never counted.
module.exports = {
  tier: "T2",
  verify(ctx) {
    const { ts, sourceFile } = ctx;
    const ev = [];
    let bad = 0;
    const push = (n, isBad) => {
      const pos = sourceFile.getLineAndCharacterOfPosition(n.getStart(sourceFile));
      if (isBad) bad += 1;
      ev.push({ line: pos.line + 1, column: pos.character + 1,
                node_kind: ts.SyntaxKind[n.kind] + (isBad ? ":default" : ":named"),
                text: n.getText(sourceFile).split("\n")[0] });
    };
    const hasMod = (n, kind) => {
      const mods = ts.canHaveModifiers && ts.canHaveModifiers(n) ? ts.getModifiers(n) : n.modifiers;
      return !!(mods && mods.some((m) => m.kind === kind));
    };
    const nameIsDefault = (id) => !!id && (id.text === "default" || id.escapedText === "default");
    for (const st of sourceFile.statements) {
      if (ts.isExportAssignment(st)) {
        // export default <expr>  /  export = <expr>
        push(st, true);
      } else if (ts.isExportDeclaration(st)) {
        let isBad = false;
        const clause = st.exportClause;
        if (clause) {
          if (ts.isNamedExports(clause)) {
            isBad = clause.elements.some((e) => nameIsDefault(e.name));
          } else if (ts.isNamespaceExport && ts.isNamespaceExport(clause)) {
            isBad = nameIsDefault(clause.name);
          }
        }
        push(st, isBad);
      } else if (hasMod(st, ts.SyntaxKind.ExportKeyword)) {
        push(st, hasMod(st, ts.SyntaxKind.DefaultKeyword));
      }
    }
    if (ev.length === 0) return { outcome: "NOT_APPLICABLE", evidence: [] };
    return { outcome: bad ? "VIOLATED" : "SATISFIED", evidence: ev };
  },
};
