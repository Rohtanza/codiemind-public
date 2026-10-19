// R43_155 (T2): "Use try-catch blocks with typed catch clauses."
// Governed construct: every CatchClause of a try statement. Promise .catch(...) calls and
// try/finally without a catch are not instances. A clause conforms only when it declares a
// binding AND that binding carries an explicit type annotation (`unknown` or `any`).
// `catch (e)`, `catch { }` and unannotated destructuring `catch ({ message })` violate.
// Exact on the syntax tree: comments and strings mentioning catch are not visited.
module.exports = {
  tier: "T2",
  verify(ctx) {
    const { ts, sourceFile } = ctx;
    const ev = [];
    let bad = 0;
    const visit = (n) => {
      if (ts.isCatchClause(n)) {
        const decl = n.variableDeclaration;
        const typed = !!(decl && decl.type);
        if (!typed) bad += 1;
        const pos = sourceFile.getLineAndCharacterOfPosition(n.getStart(sourceFile));
        const head = decl ? "catch (" + decl.getText(sourceFile) + ")" : "catch";
        ev.push({ line: pos.line + 1, column: pos.character + 1,
                  node_kind: ts.SyntaxKind[n.kind],
                  text: head + (typed ? " [typed]" : decl ? " [untyped binding]" : " [no binding]") });
      }
      ts.forEachChild(n, visit);
    };
    visit(sourceFile);
    if (ev.length === 0) return { outcome: "NOT_APPLICABLE", evidence: [] };
    return { outcome: bad ? "VIOLATED" : "SATISFIED", evidence: ev };
  },
};
