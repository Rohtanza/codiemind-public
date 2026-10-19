// R72_64 (T2): "Write small classes with a single purpose, with less than 200 instructions,
// less than 10 public methods, and less than 10 properties."
// Governed construct: every ClassDeclaration / ClassExpression. Per class:
//   public methods  = distinct (static?, name) of MethodDeclaration / Get/SetAccessor that are
//                     not private/protected and not #private (constructor excluded; overload
//                     signatures and get/set pairs of one name count once);
//   properties      = distinct names of PropertyDeclarations (any accessibility), constructor
//                     parameter properties, and `this.name = ...` assignments in the constructor
//                     body not already declared;
//   instructions    = statement nodes (Block and EmptyStatement excluded) anywhere in members.
// Conforms iff methods < 10, properties < 10, instructions < 200. 'Single purpose' unused.
// Purely syntactic: object literals and interfaces are never classes.
const STATEMENT_KINDS = [
  "VariableStatement", "ExpressionStatement", "IfStatement", "DoStatement", "WhileStatement",
  "ForStatement", "ForInStatement", "ForOfStatement", "ContinueStatement", "BreakStatement",
  "ReturnStatement", "WithStatement", "SwitchStatement", "LabeledStatement", "ThrowStatement",
  "TryStatement", "DebuggerStatement", "FunctionDeclaration", "ClassDeclaration",
];

module.exports = {
  tier: "T2",
  verify(ctx) {
    const { ts, sourceFile } = ctx;
    const SK = ts.SyntaxKind;
    const stmtKinds = new Set(STATEMENT_KINDS.map((k) => SK[k]));
    const ev = [];
    let bad = 0;

    const hasMod = (n, kind) => {
      const mods = ts.canHaveModifiers(n) ? ts.getModifiers(n) : undefined;
      return !!(mods && mods.some((m) => m.kind === kind));
    };
    const nameKey = (nm) => {
      if (!nm) return null;
      if (ts.isIdentifier(nm) || ts.isPrivateIdentifier(nm)) return nm.text;
      if (ts.isStringLiteral(nm) || ts.isNumericLiteral(nm)) return String(nm.text);
      return "[" + nm.getText(sourceFile) + "]";
    };
    const countStatements = (node) => {
      let c = 0;
      const walk = (n) => {
        if (stmtKinds.has(n.kind)) c += 1;
        ts.forEachChild(n, walk);
      };
      walk(node);
      return c;
    };
    const collectThisAssignments = (body, out) => {
      const walk = (n) => {
        // `this` is rebound inside non-arrow functions and nested classes.
        if (ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isClassLike(n) ||
            ts.isMethodDeclaration(n) || ts.isGetAccessorDeclaration(n) || ts.isSetAccessorDeclaration(n)) return;
        if (ts.isBinaryExpression(n) && n.operatorToken.kind === SK.EqualsToken &&
            ts.isPropertyAccessExpression(n.left) && n.left.expression.kind === SK.ThisKeyword) {
          out.add(nameKey(n.left.name));
        }
        ts.forEachChild(n, walk);
      };
      walk(body);
    };

    const checkClass = (cls) => {
      const methods = new Set();
      const props = new Set();
      let instructions = 0;
      for (const m of cls.members) {
        instructions += countStatements(m);
        if (ts.isMethodDeclaration(m) || ts.isGetAccessorDeclaration(m) || ts.isSetAccessorDeclaration(m)) {
          if (m.name && ts.isPrivateIdentifier(m.name)) continue;
          if (hasMod(m, SK.PrivateKeyword) || hasMod(m, SK.ProtectedKeyword)) continue;
          methods.add((hasMod(m, SK.StaticKeyword) ? "static " : "") + nameKey(m.name));
        } else if (ts.isPropertyDeclaration(m)) {
          props.add((hasMod(m, SK.StaticKeyword) ? "static " : "") + nameKey(m.name));
        } else if (ts.isConstructorDeclaration(m)) {
          for (const p of m.parameters) {
            if (ts.isParameterPropertyDeclaration(p, m) && ts.isIdentifier(p.name)) props.add(p.name.text);
          }
        }
      }
      for (const m of cls.members) {
        if (ts.isConstructorDeclaration(m) && m.body) {
          const assigned = new Set();
          collectThisAssignments(m.body, assigned);
          for (const a of assigned) if (a !== null) props.add(a);
        }
      }
      const ok = methods.size < 10 && props.size < 10 && instructions < 200;
      if (!ok) bad += 1;
      const pos = sourceFile.getLineAndCharacterOfPosition(cls.getStart(sourceFile));
      const label = cls.name ? cls.name.text : "<anonymous>";
      ev.push({
        line: pos.line + 1, column: pos.character + 1, node_kind: SK[cls.kind],
        text: `class ${label}: public_methods=${methods.size}, properties=${props.size}, ` +
              `instructions=${instructions} -> ${ok ? "conforms" : "exceeds limit"}`,
      });
    };

    const visit = (n) => {
      if (ts.isClassDeclaration(n) || ts.isClassExpression(n)) checkClass(n);
      ts.forEachChild(n, visit);
    };
    visit(sourceFile);
    if (ev.length === 0) return { outcome: "NOT_APPLICABLE", evidence: [] };
    return { outcome: bad ? "VIOLATED" : "SATISFIED", evidence: ev };
  },
};
