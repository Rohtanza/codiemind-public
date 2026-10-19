// Reference T2 (METHODOLOGY_1 §3 worked example): "Use arrow functions instead of function
// declarations." Governed construct: function-valued code with a body written as a
// FunctionDeclaration, FunctionExpression or ArrowFunction. Body-less overload/ambient
// signatures and generator functions (which no arrow can express) are not instances.
// Exact on the syntax tree: strings, comments and line breaks cannot fool it.
module.exports = {
  tier: "T2",
  verify(ctx) {
    const { ts, sourceFile } = ctx;
    const ev = [];
    let bad = 0;
    const visit = (n) => {
      const decl = ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n);
      if ((decl && n.body && !n.asteriskToken) || ts.isArrowFunction(n)) {
        const pos = sourceFile.getLineAndCharacterOfPosition(n.getStart(sourceFile));
        if (decl) bad += 1;
        ev.push({ line: pos.line + 1, column: pos.character + 1,
                  node_kind: ts.SyntaxKind[n.kind], text: n.getText(sourceFile).split("\n")[0] });
      }
      ts.forEachChild(n, visit);
    };
    visit(sourceFile);
    if (ev.length === 0) return { outcome: "NOT_APPLICABLE", evidence: [] };
    return { outcome: bad ? "VIOLATED" : "SATISFIED", evidence: ev };
  },
};
