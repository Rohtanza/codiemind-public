// R79_6 (T2): "Interfaces must be in PascalCase with an 'I' prefix (`IServiceName`)."
// Governed construct: every InterfaceDeclaration node (any modifiers, top level or nested in a
// namespace / ambient module). Instance = the declared name (type parameters excluded).
// Conforming name: ^I[A-Z][A-Za-z0-9]*$. Interface-like text inside strings, template literals
// or comments is not a declaration and never appears as an InterfaceDeclaration node.
module.exports = {
  tier: "T2",
  verify(ctx) {
    const { ts, sourceFile } = ctx;
    const ok = /^I[A-Z][A-Za-z0-9]*$/;
    const ev = [];
    let bad = 0;
    const visit = (n) => {
      if (ts.isInterfaceDeclaration(n) && n.name) {
        const name = n.name.text;
        const pos = sourceFile.getLineAndCharacterOfPosition(n.name.getStart(sourceFile));
        const conforms = ok.test(name);
        if (!conforms) bad += 1;
        ev.push({ line: pos.line + 1, column: pos.character + 1,
                  node_kind: ts.SyntaxKind[n.kind],
                  text: "interface " + name + (conforms ? " (conforms)" : " (violates ^I[A-Z][A-Za-z0-9]*$)") });
      }
      ts.forEachChild(n, visit);
    };
    visit(sourceFile);
    if (ev.length === 0) return { outcome: "NOT_APPLICABLE", evidence: [] };
    return { outcome: bad ? "VIOLATED" : "SATISFIED", evidence: ev };
  },
};
