// R43_125 (T2): "Prefer interfaces over types for object definitions."
// Governed construct: every InterfaceDeclaration (conforming) and every TypeAliasDeclaration
// whose aliased type, after stripping parentheses, is an object type literal `{ ... }`, or a
// union whose members are all (parenthesized) object type literals (non-conforming).
// Other type aliases (literal unions, function types, references, mapped/conditional types,
// keyof, ...) are not instances. Inline object types in annotations and values are ignored.
// Syntax-tree based, so comments and strings cannot fool it.
module.exports = {
  tier: "T2",
  verify(ctx) {
    const { ts, sourceFile } = ctx;
    const ev = [];
    let bad = 0;
    const strip = (t) => {
      while (t && ts.isParenthesizedTypeNode(t)) t = t.type;
      return t;
    };
    const isObjDef = (t) => {
      t = strip(t);
      if (!t) return false;
      if (ts.isTypeLiteralNode(t)) return true;
      if (ts.isUnionTypeNode(t)) {
        return t.types.length > 0 && t.types.every((m) => ts.isTypeLiteralNode(strip(m)));
      }
      return false;
    };
    const record = (n) => {
      const pos = sourceFile.getLineAndCharacterOfPosition(n.getStart(sourceFile));
      ev.push({ line: pos.line + 1, column: pos.character + 1,
                node_kind: ts.SyntaxKind[n.kind], text: n.getText(sourceFile).split("\n")[0] });
    };
    const visit = (n) => {
      if (ts.isInterfaceDeclaration(n)) {
        record(n);
      } else if (ts.isTypeAliasDeclaration(n) && isObjDef(n.type)) {
        bad += 1;
        record(n);
      }
      ts.forEachChild(n, visit);
    };
    visit(sourceFile);
    if (ev.length === 0) return { outcome: "NOT_APPLICABLE", evidence: [] };
    return { outcome: bad ? "VIOLATED" : "SATISFIED", evidence: ev };
  },
};
