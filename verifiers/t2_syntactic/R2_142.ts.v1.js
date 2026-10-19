// R2_142 (T2): "Use interfaces for all data structures."
// Governed construct: a named object-shaped type declaration — an InterfaceDeclaration
// (conforming) or a TypeAliasDeclaration whose aliased type is an object type literal
// (non-conforming), anywhere in the file (namespaces, modules, declare global included).
// Aliases to unions, primitives, functions, tuples, mapped types etc. are not instances.
// Syntax-tree exact: text inside strings, template literals and comments is never a node.
module.exports = {
  tier: "T2",
  verify(ctx) {
    const { ts, sourceFile } = ctx;
    const ev = [];
    let bad = 0;
    const unwrap = (t) => {
      while (t && ts.isParenthesizedTypeNode(t)) t = t.type;
      return t;
    };
    const push = (n) => {
      const pos = sourceFile.getLineAndCharacterOfPosition(n.getStart(sourceFile));
      ev.push({ line: pos.line + 1, column: pos.character + 1,
                node_kind: ts.SyntaxKind[n.kind], text: n.getText(sourceFile).split("\n")[0] });
    };
    const visit = (n) => {
      if (ts.isInterfaceDeclaration(n)) {
        push(n);
      } else if (ts.isTypeAliasDeclaration(n)) {
        const body = unwrap(n.type);
        if (body && ts.isTypeLiteralNode(body)) {
          bad += 1;
          push(n);
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sourceFile);
    if (ev.length === 0) return { outcome: "NOT_APPLICABLE", evidence: [] };
    return { outcome: bad ? "VIOLATED" : "SATISFIED", evidence: ev };
  },
};
