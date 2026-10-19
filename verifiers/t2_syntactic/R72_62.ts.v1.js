// R72_62 (T2): "Prefer composition over inheritance."
// Governed construct: every ClassDeclaration / ClassExpression (one instance each).
// A class violates when it carries an `extends` heritage clause (implementation inheritance),
// whatever the base expression (user class, abstract class, React.Component, Error, mixin call,
// anonymous `class extends Base`). `implements` clauses conform. Interface `extends` and generic
// constraints `<T extends X>` are not class heritage clauses and are ignored. Comments, strings
// and template literals are not syntax-tree class nodes, so they cannot trigger it.
module.exports = {
  tier: "T2",
  verify(ctx) {
    const { ts, sourceFile } = ctx;
    const ev = [];
    let bad = 0;
    const visit = (n) => {
      if (ts.isClassDeclaration(n) || ts.isClassExpression(n)) {
        const clauses = n.heritageClauses || [];
        const ext = clauses.find((c) => c.token === ts.SyntaxKind.ExtendsKeyword);
        const target = ext || n;
        const pos = sourceFile.getLineAndCharacterOfPosition(target.getStart(sourceFile));
        const name = n.name ? n.name.text : "<anonymous>";
        if (ext) bad += 1;
        ev.push({
          line: pos.line + 1,
          column: pos.character + 1,
          node_kind: ts.SyntaxKind[n.kind],
          text: ext
            ? "class " + name + " " + ext.getText(sourceFile).replace(/\s+/g, " ")
            : "class " + name + " (no extends clause)",
        });
      }
      ts.forEachChild(n, visit);
    };
    visit(sourceFile);
    if (ev.length === 0) return { outcome: "NOT_APPLICABLE", evidence: [] };
    return { outcome: bad ? "VIOLATED" : "SATISFIED", evidence: ev };
  },
};
