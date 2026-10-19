// R32_124 (T2): "Initialization Functions should be named Initialize{Category}()".
// Governed construct: a function DEFINITION whose name begins with "init" (case-insensitive):
// function declarations, named function expressions, functions/arrows bound to a variable,
// class methods, class fields and object-literal properties whose value is a function,
// object-literal methods, and functions assigned to an identifier or member (a.b = function).
// Conforms iff the name matches ^Initialize[A-Z][A-Za-z0-9]*$. Calls, imports, shorthand
// properties and non-function bindings are not instances. Comments/strings never reach the AST.
module.exports = {
  tier: "T2",
  verify(ctx) {
    const { ts, sourceFile } = ctx;
    const GOVERNED = /^init/i;
    const OK = /^Initialize[A-Z][A-Za-z0-9]*$/;
    const ev = [];
    let bad = 0;

    const unwrap = (e) => {
      let x = e;
      while (x && (ts.isParenthesizedExpression(x) || ts.isAsExpression(x) ||
             ts.isTypeAssertionExpression(x) || ts.isNonNullExpression(x) ||
             (ts.isSatisfiesExpression && ts.isSatisfiesExpression(x)))) {
        x = x.expression;
      }
      return x;
    };
    const isFn = (e) => {
      const x = unwrap(e);
      return !!x && (ts.isFunctionExpression(x) || ts.isArrowFunction(x));
    };
    const nameText = (nm) => {
      if (!nm) return null;
      if (ts.isIdentifier(nm) || ts.isStringLiteral(nm) ||
          ts.isNoSubstitutionTemplateLiteral(nm)) return nm.text;
      if (ts.isPrivateIdentifier(nm)) return nm.text.replace(/^#/, "");
      return null; // computed / numeric / binding patterns: no static name
    };
    const record = (nameNode, name, defNode) => {
      if (name === null || !GOVERNED.test(name)) return;
      const pos = sourceFile.getLineAndCharacterOfPosition(nameNode.getStart(sourceFile));
      const conforms = OK.test(name);
      if (!conforms) bad += 1;
      ev.push({ line: pos.line + 1, column: pos.character + 1,
                node_kind: ts.SyntaxKind[defNode.kind],
                text: (conforms ? "conforms: " : "violates: ") + name });
    };

    const visit = (n) => {
      if (ts.isFunctionDeclaration(n) && n.name) {
        record(n.name, nameText(n.name), n);
      } else if (ts.isFunctionExpression(n) && n.name) {
        record(n.name, nameText(n.name), n);
      } else if (ts.isMethodDeclaration(n)) {
        record(n.name, nameText(n.name), n);
      } else if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && isFn(n.initializer)) {
        record(n.name, nameText(n.name), n);
      } else if ((ts.isPropertyAssignment(n) || ts.isPropertyDeclaration(n)) &&
                 isFn(n.initializer)) {
        record(n.name, nameText(n.name), n);
      } else if (ts.isBinaryExpression(n) &&
                 n.operatorToken.kind === ts.SyntaxKind.EqualsToken && isFn(n.right)) {
        const l = unwrap(n.left);
        if (ts.isIdentifier(l)) record(l, l.text, n);
        else if (ts.isPropertyAccessExpression(l)) record(l.name, nameText(l.name), n);
        else if (ts.isElementAccessExpression(l) && l.argumentExpression &&
                 (ts.isStringLiteral(l.argumentExpression) ||
                  ts.isNoSubstitutionTemplateLiteral(l.argumentExpression))) {
          record(l.argumentExpression, l.argumentExpression.text, n);
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sourceFile);

    if (ev.length === 0) return { outcome: "NOT_APPLICABLE", evidence: [] };
    return { outcome: bad ? "VIOLATED" : "SATISFIED", evidence: ev };
  },
};
