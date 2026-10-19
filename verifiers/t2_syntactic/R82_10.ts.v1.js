// R82_10 (T2): "Use early returns to avoid nested conditions and improve readability."
// Governed construct: an IfStatement inside a function body (declaration, expression, arrow,
// method, constructor, accessor). Module-top-level ifs are not instances.
// Non-conforming: an IfStatement that lies inside the then- or else-branch of another
// IfStatement of the SAME function, at any depth (through loops, blocks, try, switch), without
// crossing a nested function boundary. An IfStatement that is directly the `else` of another
// IfStatement (an else-if chain) inherits its parent's status rather than counting as nested.
// Exact on the syntax tree: comments and strings cannot fool it.
module.exports = {
  tier: "T2",
  verify(ctx) {
    const { ts, sourceFile } = ctx;
    const ev = [];
    let bad = 0;
    const isFn = (n) =>
      ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isArrowFunction(n) ||
      ts.isMethodDeclaration(n) || ts.isConstructorDeclaration(n) ||
      ts.isGetAccessorDeclaration(n) || ts.isSetAccessorDeclaration(n);
    // inFn: inside a function body; inIf: inside a branch of an if of the same function.
    const visit = (n, inFn, inIf) => {
      if (isFn(n)) {
        ts.forEachChild(n, (c) => visit(c, true, false));
        return;
      }
      if (ts.isClassStaticBlockDeclaration(n)) {
        ts.forEachChild(n, (c) => visit(c, false, false));
        return;
      }
      if (ts.isIfStatement(n)) {
        if (inFn) {
          const pos = sourceFile.getLineAndCharacterOfPosition(n.getStart(sourceFile));
          if (inIf) bad += 1;
          ev.push({ line: pos.line + 1, column: pos.character + 1,
                    node_kind: inIf ? "IfStatement(nested)" : "IfStatement",
                    text: n.getText(sourceFile).split("\n")[0] });
        }
        visit(n.expression, inFn, inIf);
        visit(n.thenStatement, inFn, true);
        if (n.elseStatement) {
          if (ts.isIfStatement(n.elseStatement)) visit(n.elseStatement, inFn, inIf);
          else visit(n.elseStatement, inFn, true);
        }
        return;
      }
      ts.forEachChild(n, (c) => visit(c, inFn, inIf));
    };
    visit(sourceFile, false, false);
    if (ev.length === 0) return { outcome: "NOT_APPLICABLE", evidence: [] };
    return { outcome: bad ? "VIOLATED" : "SATISFIED", evidence: ev };
  },
};
