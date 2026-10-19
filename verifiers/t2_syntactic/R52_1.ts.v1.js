// R52_1 (T2): "Keep components small and focused - if they exceed 100 lines, break them down."
// Governed construct: a React component definition, i.e.
//   - a function declaration / function expression / arrow function bound to a PascalCase name
//     (variable, assignment, property, class field, or the function's own name), possibly wrapped
//     directly in memo/forwardRef (React.memo, React.forwardRef, nested), whose body contains JSX;
//   - a class with a PascalCase name extending Component / PureComponent / React.Component /
//     React.PureComponent.
// Each definition (nested ones included) is one instance. Size = physical source lines spanned
// by the definition node, from the line where the declaration starts to the line of its closing
// token, inclusive. More than 100 lines -> VIOLATED. Comments and strings are not syntax nodes,
// so commented-out components are never counted.
module.exports = {
  tier: "T2",
  verify(ctx) {
    const { ts, sourceFile } = ctx;
    const LIMIT = 100;
    const PASCAL = /^[A-Z][A-Za-z0-9_$]*$/;
    const WRAPPERS = { memo: 1, forwardRef: 1 };
    const COMPONENT_BASES = { Component: 1, PureComponent: 1 };
    const ev = [];
    let bad = 0;
    const seen = [];

    const lineOf = (pos) => sourceFile.getLineAndCharacterOfPosition(pos);

    const isFn = (n) => ts.isArrowFunction(n) || ts.isFunctionExpression(n) || ts.isFunctionDeclaration(n);

    const strip = (n) => {
      while (n && (ts.isParenthesizedExpression(n) || ts.isAsExpression(n) ||
                   ts.isSatisfiesExpression(n) || ts.isNonNullExpression(n) ||
                   ts.isTypeAssertionExpression(n))) n = n.expression;
      return n;
    };

    const wrapperName = (callee) => {
      callee = strip(callee);
      if (ts.isIdentifier(callee)) return callee.text;
      if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.name)) return callee.name.text;
      return null;
    };

    // Unwrap memo(...)/forwardRef(...) layers to reach a function node.
    const unwrapToFn = (n) => {
      n = strip(n);
      let depth = 0;
      while (n && ts.isCallExpression(n) && depth < 5) {
        const w = wrapperName(n.expression);
        if (!w || !WRAPPERS[w] || n.arguments.length === 0) return null;
        n = strip(n.arguments[0]);
        depth += 1;
      }
      return n && (ts.isArrowFunction(n) || ts.isFunctionExpression(n)) ? n : null;
    };

    const containsJsx = (n) => {
      let found = false;
      const walk = (c) => {
        if (found) return;
        if (ts.isJsxElement(c) || ts.isJsxSelfClosingElement(c) || ts.isJsxFragment(c)) {
          found = true;
          return;
        }
        ts.forEachChild(c, walk);
      };
      if (n.body) walk(n.body);
      return found;
    };

    const nameText = (nm) => (nm && (ts.isIdentifier(nm) || ts.isPrivateIdentifier(nm) ||
                                     ts.isStringLiteral(nm)) ? nm.text.replace(/^#/, "") : null);

    const record = (spanNode, fnOrClass, name, kind) => {
      if (seen.indexOf(fnOrClass) !== -1) return;
      seen.push(fnOrClass);
      const start = lineOf(spanNode.getStart(sourceFile));
      const end = lineOf(spanNode.getEnd());
      const lines = end.line - start.line + 1;
      const over = lines > LIMIT;
      if (over) bad += 1;
      ev.push({
        line: start.line + 1,
        column: start.character + 1,
        node_kind: kind,
        text: `${name}: ${lines} lines (limit ${LIMIT})${over ? " - exceeds limit" : ""}`,
      });
    };

    const extendsComponent = (cls) => {
      if (!cls.heritageClauses) return false;
      for (const hc of cls.heritageClauses) {
        if (hc.token !== ts.SyntaxKind.ExtendsKeyword) continue;
        for (const t of hc.types) {
          const e = strip(t.expression);
          if (ts.isIdentifier(e) && COMPONENT_BASES[e.text]) return true;
          if (ts.isPropertyAccessExpression(e) && ts.isIdentifier(e.name) &&
              COMPONENT_BASES[e.name.text] && ts.isIdentifier(e.expression) &&
              e.expression.text === "React") return true;
        }
      }
      return false;
    };

    // Span node for a binding: the whole variable statement when it declares a single binding
    // (so `export const X = ...` starts at `export`), else the declaration itself.
    const varSpan = (decl) => {
      const list = decl.parent;
      if (list && ts.isVariableDeclarationList(list) && list.declarations.length === 1 &&
          list.parent && ts.isVariableStatement(list.parent)) return list.parent;
      return decl;
    };

    const visit = (n) => {
      if (ts.isFunctionDeclaration(n) && n.body && n.name && PASCAL.test(n.name.text) && containsJsx(n)) {
        record(n, n, n.name.text, "FunctionDeclaration");
      } else if (ts.isVariableDeclaration(n) && n.initializer && ts.isIdentifier(n.name) &&
                 PASCAL.test(n.name.text)) {
        const fn = unwrapToFn(n.initializer);
        if (fn && containsJsx(fn)) record(varSpan(n), fn, n.name.text, ts.SyntaxKind[fn.kind]);
        const cls = strip(n.initializer);
        if (cls && ts.isClassExpression(cls) && extendsComponent(cls)) {
          record(varSpan(n), cls, n.name.text, "ClassExpression");
        }
      } else if ((ts.isPropertyAssignment(n) || ts.isPropertyDeclaration(n)) && n.initializer &&
                 nameText(n.name) && PASCAL.test(nameText(n.name))) {
        const fn = unwrapToFn(n.initializer);
        if (fn && containsJsx(fn)) record(n, fn, nameText(n.name), ts.SyntaxKind[fn.kind]);
      } else if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
        const l = n.left;
        const nm = ts.isIdentifier(l) ? l.text :
          (ts.isPropertyAccessExpression(l) && ts.isIdentifier(l.name) ? l.name.text : null);
        if (nm && PASCAL.test(nm)) {
          const fn = unwrapToFn(n.right);
          if (fn && containsJsx(fn)) {
            const span = n.parent && ts.isExpressionStatement(n.parent) ? n.parent : n;
            record(span, fn, nm, ts.SyntaxKind[fn.kind]);
          }
        }
      } else if (ts.isClassDeclaration(n) && n.name && PASCAL.test(n.name.text) && extendsComponent(n)) {
        record(n, n, n.name.text, "ClassDeclaration");
      }
      // Named function expressions / memo(function Foo() {}) not bound through a variable,
      // e.g. `export default memo(function Card() { ... })`.
      if (ts.isFunctionExpression(n) && n.name && PASCAL.test(n.name.text) && containsJsx(n) &&
          seen.indexOf(n) === -1) {
        record(n, n, n.name.text, "FunctionExpression");
      }
      if (ts.isClassExpression(n) && n.name && PASCAL.test(n.name.text) && extendsComponent(n) &&
          seen.indexOf(n) === -1) {
        record(n, n, n.name.text, "ClassExpression");
      }
      ts.forEachChild(n, visit);
    };
    visit(sourceFile);
    // Order of a variable binding vs. its named function expression is resolved by `seen`:
    // the variable visit happens first (parent before child), so the binding's span wins.
    if (ev.length === 0) return { outcome: "NOT_APPLICABLE", evidence: [] };
    return { outcome: bad ? "VIOLATED" : "SATISFIED", evidence: ev };
  },
};
