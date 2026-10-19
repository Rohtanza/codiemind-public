// R32_391 (T2): "Validate method behavior: Do NOT check claims.EXP; expiration is handled by
// Redis TTL." Governed construct: every function-valued definition named `validate` with a body
// (class method, class property / object property / variable / assignment target initialised with
// an arrow or function expression, function declaration, named function expression).
// An instance VIOLATES if its parameters or body (nested callbacks included) read a property named
// `exp` (case-insensitive): `x.exp`, `x?.exp`, `x['exp']`, or an object destructuring pattern
// (binding or assignment) that binds the `exp` key. Type positions, comments and strings never
// count; plain `=` writes and `delete` operands are not reads. Pure syntax-tree query.
module.exports = {
  tier: "T2",
  verify(ctx) {
    const { ts, sourceFile } = ctx;
    const isExp = (s) => typeof s === "string" && s.toLowerCase() === "exp";
    const nameText = (nm) => {
      if (!nm) return null;
      if (ts.isIdentifier(nm) || ts.isStringLiteral(nm) || ts.isNoSubstitutionTemplateLiteral(nm)) return nm.text;
      if (ts.isComputedPropertyName(nm)) {
        const e = nm.expression;
        if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return e.text;
      }
      return null;
    };
    const isFnExpr = (e) => {
      while (e && (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) ||
                   ts.isSatisfiesExpression(e) || ts.isTypeAssertionExpression(e))) e = e.expression;
      return e && (ts.isArrowFunction(e) || ts.isFunctionExpression(e)) ? e : null;
    };
    const pos = (n) => sourceFile.getLineAndCharacterOfPosition(n.getStart(sourceFile));
    const ev = [];
    let bad = 0;

    const isPlainAssignTarget = (n) => {
      const p = n.parent;
      return p && ts.isBinaryExpression(p) && p.left === n &&
             p.operatorToken.kind === ts.SyntaxKind.EqualsToken;
    };
    const isDeleteOperand = (n) => n.parent && ts.isDeleteExpression(n.parent);
    // Is an object literal the target of a destructuring assignment?
    const isDestructTarget = (obj) => {
      let cur = obj;
      for (;;) {
        const p = cur.parent;
        if (!p) return false;
        if (ts.isBinaryExpression(p) && p.left === cur &&
            p.operatorToken.kind === ts.SyntaxKind.EqualsToken) return true;
        if (ts.isForOfStatement(p) || ts.isForInStatement(p)) return p.initializer === cur;
        if (ts.isParenthesizedExpression(p) || ts.isArrayLiteralExpression(p) ||
            ts.isSpreadElement(p)) { cur = p; continue; }
        if ((ts.isPropertyAssignment(p) && p.initializer === cur) ||
            ts.isShorthandPropertyAssignment(p)) { cur = p.parent; continue; }
        if (ts.isBinaryExpression(p) && p.left === cur) { cur = p; continue; }
        return false;
      }
    };

    // Collect exp reads under a node; returns the list of offending nodes.
    const findReads = (root) => {
      const hits = [];
      const walk = (n) => {
        if (ts.isTypeNode(n) || ts.isTypeAliasDeclaration(n) || ts.isInterfaceDeclaration(n)) return;
        if (ts.isPropertyAccessExpression(n) && isExp(n.name.text) &&
            !isPlainAssignTarget(n) && !isDeleteOperand(n)) hits.push(n);
        else if (ts.isElementAccessExpression(n) && n.argumentExpression &&
                 (ts.isStringLiteral(n.argumentExpression) ||
                  ts.isNoSubstitutionTemplateLiteral(n.argumentExpression)) &&
                 isExp(n.argumentExpression.text) &&
                 !isPlainAssignTarget(n) && !isDeleteOperand(n)) hits.push(n);
        else if (ts.isBindingElement(n) && ts.isObjectBindingPattern(n.parent) && !n.dotDotDotToken) {
          const key = n.propertyName ? nameText(n.propertyName) : nameText(n.name);
          if (isExp(key)) hits.push(n);
        } else if (ts.isObjectLiteralExpression(n) && isDestructTarget(n)) {
          for (const pr of n.properties) {
            if ((ts.isShorthandPropertyAssignment(pr) || ts.isPropertyAssignment(pr)) &&
                isExp(nameText(pr.name))) hits.push(pr);
          }
        }
        ts.forEachChild(n, walk);
      };
      walk(root);
      return hits;
    };

    const examine = (fn, anchor) => {
      if (!fn || !fn.body) return;
      const hits = [];
      for (const p of fn.parameters) hits.push(...findReads(p));
      hits.push(...findReads(fn.body));
      const at = pos(anchor);
      ev.push({ line: at.line + 1, column: at.character + 1, node_kind: ts.SyntaxKind[anchor.kind],
                text: (hits.length ? "VIOLATION validate: " : "validate: ") +
                      anchor.getText(sourceFile).split("\n")[0].slice(0, 120) });
      if (hits.length) {
        bad += 1;
        for (const h of hits) {
          const hp = pos(h);
          ev.push({ line: hp.line + 1, column: hp.character + 1, node_kind: ts.SyntaxKind[h.kind],
                    text: "exp read: " + h.getText(sourceFile).split("\n")[0].slice(0, 120) });
        }
      }
    };

    const seen = new Set();
    const consider = (fn, anchor) => { if (fn && !seen.has(fn)) { seen.add(fn); examine(fn, anchor); } };

    const visit = (n) => {
      if ((ts.isMethodDeclaration(n) || ts.isFunctionDeclaration(n)) && nameText(n.name) === "validate") {
        consider(n, n);
      } else if ((ts.isPropertyDeclaration(n) || ts.isPropertyAssignment(n)) &&
                 nameText(n.name) === "validate") {
        consider(isFnExpr(n.initializer), n);
      } else if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === "validate") {
        consider(isFnExpr(n.initializer), n);
      } else if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
        const l = n.left;
        const lname = ts.isIdentifier(l) ? l.text
          : ts.isPropertyAccessExpression(l) ? l.name.text
          : (ts.isElementAccessExpression(l) && l.argumentExpression &&
             (ts.isStringLiteral(l.argumentExpression) ||
              ts.isNoSubstitutionTemplateLiteral(l.argumentExpression))) ? l.argumentExpression.text
          : null;
        if (lname === "validate") consider(isFnExpr(n.right), n);
      } else if (ts.isFunctionExpression(n) && n.name && n.name.text === "validate") {
        consider(n, n);
      }
      ts.forEachChild(n, visit);
    };
    visit(sourceFile);

    if (ev.length === 0) return { outcome: "NOT_APPLICABLE", evidence: [] };
    return { outcome: bad ? "VIOLATED" : "SATISFIED", evidence: ev };
  },
};
