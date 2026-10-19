// R72_46 (T3): "If it returns a boolean, use isX or hasX, canX, etc."
// Governed construct: a NAMED function whose resolved return type is boolean (or a type
// predicate `x is T`): function declarations, class/object-literal methods, getters, and arrow
// functions / function expressions bound to a named variable, class property or object
// property. Anonymous inline callbacks are not instances. Whether the function returns boolean
// is decided by the type checker (inferred return types, local aliases such as
// `type Toggle = boolean`), which a single-file syntax query cannot do: hence T3.
// Promise<boolean>, boolean | undefined, any and other non-boolean types are not governed.
// Conformance: the name starts with a boolean prefix followed by an uppercase letter.
module.exports = {
  tier: "T3",
  verify(ctx) {
    const { ts, sourceFile, checker } = ctx;
    const PREFIX = /^(is|has|can|should|will|was|were|did|does|are|needs|must|allows|supports|contains|includes)[A-Z]/;
    const ev = [];
    let bad = 0;
    const where = (n) => sourceFile.getLineAndCharacterOfPosition(n.getStart(sourceFile));

    const nameText = (nameNode) => {
      if (!nameNode) return undefined;
      if (ts.isIdentifier(nameNode)) return nameNode.text;
      if (ts.isPrivateIdentifier(nameNode)) return nameNode.text.replace(/^#/, "");
      if (ts.isStringLiteral(nameNode) || ts.isNoSubstitutionTemplateLiteral(nameNode)) return nameNode.text;
      return undefined; // computed / numeric names: no stable name
    };

    // Returns the name node for a governed function-like node, or undefined if not named.
    const boundName = (fn) => {
      if (ts.isFunctionDeclaration(fn) || ts.isMethodDeclaration(fn) || ts.isGetAccessorDeclaration(fn)) {
        return fn.name;
      }
      if (ts.isArrowFunction(fn) || ts.isFunctionExpression(fn)) {
        let child = fn;
        let p = fn.parent;
        // unwrap parentheses, `as`, `satisfies`, non-null wrappers around the initializer
        while (p && (ts.isParenthesizedExpression(p) || ts.isAsExpression(p) ||
          (ts.isSatisfiesExpression && ts.isSatisfiesExpression(p)) || ts.isNonNullExpression(p) ||
          ts.isTypeAssertionExpression(p))) {
          child = p;
          p = p.parent;
        }
        if (!p) return undefined;
        if (ts.isVariableDeclaration(p) && p.initializer === child && ts.isIdentifier(p.name)) return p.name;
        if (ts.isPropertyDeclaration(p) && p.initializer === child) return p.name;
        if (ts.isPropertyAssignment(p) && p.initializer === child) return p.name;
        return undefined;
      }
      return undefined;
    };

    const isBooleanType = (t) => {
      if (!t) return false;
      const BL = ts.TypeFlags.BooleanLike;
      if (t.flags & BL) return true;
      if (t.isUnion && t.isUnion()) return t.types.length > 0 && t.types.every((m) => (m.flags & BL) !== 0);
      return false;
    };

    const returnsBoolean = (fn) => {
      const sig = checker.getSignatureFromDeclaration(fn);
      if (!sig) return false;
      const pred = checker.getTypePredicateOfSignature(sig);
      if (pred) {
        // `x is T` / `this is T` are boolean-returning; `asserts x` returns void
        return pred.kind === ts.TypePredicateKind.Identifier || pred.kind === ts.TypePredicateKind.This;
      }
      return isBooleanType(checker.getReturnTypeOfSignature(sig));
    };

    const hasBodyOrAbstract = (fn) => {
      if (fn.body) return true;
      // abstract methods / ambient declarations without overload siblings
      const mods = ts.getCombinedModifierFlags ? ts.getCombinedModifierFlags(fn) : 0;
      if (mods & ts.ModifierFlags.Abstract) return true;
      if (mods & ts.ModifierFlags.Ambient) return true;
      return false; // overload signature: the implementation is the instance
    };

    const visit = (n) => {
      if (ts.isFunctionDeclaration(n) || ts.isMethodDeclaration(n) || ts.isGetAccessorDeclaration(n) ||
        ts.isArrowFunction(n) || ts.isFunctionExpression(n)) {
        const nameNode = boundName(n);
        const name = nameText(nameNode);
        if (name !== undefined && hasBodyOrAbstract(n) && returnsBoolean(n)) {
          const ok = PREFIX.test(name);
          if (!ok) bad += 1;
          const p = where(nameNode);
          ev.push({
            line: p.line + 1,
            column: p.character + 1,
            node_kind: ts.SyntaxKind[n.kind] + (ok ? ":boolean-prefixed" : ":boolean-unprefixed"),
            text: name,
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
