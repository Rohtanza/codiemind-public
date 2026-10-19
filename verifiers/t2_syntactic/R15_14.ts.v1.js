// R15_14 (T2): "Use camelCase for JavaScript/TypeScript variables and functions."
// Governed construct: every binding name the code declares for a variable or function:
// var/let/const declarators (recursing through object/array binding patterns, including
// for / for-in / for-of heads and catch-clause variables), function declaration names,
// named function expressions, and parameters of functions/arrows/methods/constructors/
// accessors (recursing through destructured parameters). Not governed: property keys,
// class/interface/type/enum names, enum members, class members, imports, and parameters of
// type-only signatures (function types, interface method/call signatures), which bind nothing.
// Conformance: after stripping leading `_`/`$`, the name starts with a lowercase letter and has
// no `_` (digits and capitals allowed). A const binding written entirely in SCREAMING_SNAKE_CASE
// is accepted as a constant. A name that is only `_`/`$` characters is a placeholder and passes.
// Syntax-tree based: names inside strings and comments are never seen.
module.exports = {
  tier: "T2",
  verify(ctx) {
    const { ts, sourceFile } = ctx;
    const ev = [];
    let bad = 0;

    const camel = (name) => {
      const core = name.replace(/^[_$]+/, "");
      if (core.length === 0) return true;
      return /^[a-z][A-Za-z0-9$]*$/.test(core);
    };
    const screaming = (name) => /^_*[A-Z][A-Z0-9]*(?:_+[A-Z0-9]+)*_*$/.test(name);

    const record = (id, kind, isConst) => {
      const name = id.text;
      const ok = camel(name) || (isConst && screaming(name));
      if (!ok) bad += 1;
      const pos = sourceFile.getLineAndCharacterOfPosition(id.getStart(sourceFile));
      ev.push({ line: pos.line + 1, column: pos.character + 1, node_kind: kind,
                text: name + (ok ? " (conforms)" : " (not camelCase)") });
    };

    // Collect identifiers bound by a binding name (identifier or nested pattern).
    const bindName = (nameNode, kind, isConst) => {
      if (!nameNode) return;
      if (ts.isIdentifier(nameNode)) { record(nameNode, kind, isConst); return; }
      if (ts.isObjectBindingPattern(nameNode) || ts.isArrayBindingPattern(nameNode)) {
        for (const el of nameNode.elements) {
          if (ts.isBindingElement(el)) bindName(el.name, kind, isConst);
        }
      }
    };

    const typeOnlySig = (p) =>
      ts.isFunctionTypeNode(p) || ts.isConstructorTypeNode(p) || ts.isMethodSignature(p) ||
      ts.isCallSignatureDeclaration(p) || ts.isConstructSignatureDeclaration(p) ||
      ts.isIndexSignatureDeclaration(p) || ts.isJSDocFunctionType(p);

    const visit = (n) => {
      if (ts.isVariableDeclaration(n)) {
        const list = n.parent;
        let isConst = false;
        if (list && ts.isVariableDeclarationList(list)) {
          isConst = (list.flags & ts.NodeFlags.Const) !== 0;
        }
        bindName(n.name, ts.isCatchClause(list) ? "CatchClauseVariable" : "VariableDeclaration", isConst);
      } else if (ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n)) {
        if (n.name) record(n.name, ts.SyntaxKind[n.kind], false);
      } else if (ts.isParameter(n)) {
        const isThis = ts.isIdentifier(n.name) && n.name.text === "this";
        if (!isThis && !typeOnlySig(n.parent)) bindName(n.name, "Parameter", false);
      }
      ts.forEachChild(n, visit);
    };
    visit(sourceFile);

    if (ev.length === 0) return { outcome: "NOT_APPLICABLE", evidence: [] };
    return { outcome: bad ? "VIOLATED" : "SATISFIED", evidence: ev };
  },
};
