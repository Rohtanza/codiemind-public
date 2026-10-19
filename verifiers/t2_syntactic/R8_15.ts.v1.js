// R8_15 (T2): "Test classes are named `Test<Class>`."
// Governed construct: a test class, i.e. a ClassDeclaration (or named ClassExpression) that
//  (a) carries a suite decorator (@suite/@Suite/@TestSuite/@testSuite, bare, called, or a
//      member access of them such as @suite.skip), or
//  (b) has a member carrying a test decorator (@test/@Test, bare, called, or member access such
//      as @test.skip / @Test()), or
//  (c) is named as a test container: ends in Test/Tests/Spec, or starts with Test followed by an
//      uppercase letter or underscore.
// Conforms iff the class identifier matches ^Test[A-Z][A-Za-z0-9]*$.
// Syntax-tree based: class-like text in comments and string/template literals is never visited.
module.exports = {
  tier: "T2",
  verify(ctx) {
    const { ts, sourceFile } = ctx;
    const SUITE = new Set(["suite", "Suite", "TestSuite", "testSuite"]);
    const TEST = new Set(["test", "Test"]);
    const GOOD = /^Test[A-Z][A-Za-z0-9]*$/;
    const NAME_MARK = /(?:Tests?|Spec)$|^Test[A-Z_]/;

    const decoratorsOf = (n) => {
      const mods = n.modifiers;
      if (!mods) return [];
      return mods.filter((m) => ts.isDecorator(m));
    };
    // Root identifier of a decorator expression: @x, @x(), @x.y, @x.y(), @x()() ...
    const rootName = (expr) => {
      let e = expr;
      for (;;) {
        if (ts.isParenthesizedExpression(e)) e = e.expression;
        else if (ts.isCallExpression(e)) e = e.expression;
        else if (ts.isPropertyAccessExpression(e)) e = e.expression;
        else if (ts.isNonNullExpression(e)) e = e.expression;
        else break;
      }
      return ts.isIdentifier(e) ? e.text : null;
    };
    const hasDecoratorIn = (n, names) =>
      decoratorsOf(n).some((d) => names.has(rootName(d.expression)));

    const ev = [];
    let bad = 0;
    const visit = (n) => {
      const isDecl = ts.isClassDeclaration(n);
      const isExpr = ts.isClassExpression(n) && !!n.name;
      if (isDecl || isExpr) {
        const name = n.name ? n.name.text : "";
        const bySuite = hasDecoratorIn(n, SUITE);
        const byMember = n.members.some((m) => hasDecoratorIn(m, TEST));
        const byName = name !== "" && NAME_MARK.test(name);
        if (bySuite || byMember || byName) {
          const anchor = n.name || n;
          const pos = sourceFile.getLineAndCharacterOfPosition(anchor.getStart(sourceFile));
          const ok = GOOD.test(name);
          if (!ok) bad += 1;
          const why = [bySuite && "suite-decorator", byMember && "test-decorated-member",
                       byName && "test-name"].filter(Boolean).join("+");
          ev.push({
            line: pos.line + 1,
            column: pos.character + 1,
            node_kind: ts.SyntaxKind[n.kind],
            text: (ok ? "conforms: " : "misnamed: ") + (name || "<anonymous>") + " [" + why + "]",
          });
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sourceFile);
    if (ev.length === 0) return { outcome: "NOT_APPLICABLE", evidence: [] };
    return { outcome: bad ? "VIOLATED" : "SATISFIED", evidence: ev };
  },
};
