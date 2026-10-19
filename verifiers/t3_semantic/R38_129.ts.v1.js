// R38_129 (T3): "Prefer `@injectable` annotations over direct `getIt` calls."
// Governed construct: (a) each class decorated with `@injectable` (conforming) and (b) each call
// that goes through the `getIt` service locator — a call of, or a method call on, a binding that
// was imported/required as the export `getIt` (under any local alias). Whether an identifier is
// that binding needs symbol resolution: a local function or parameter named `getIt` is not, an
// aliased import `import { getIt as locator }` is. The checker resolves each identifier to its
// declaration; the declaration is then traced (through local aliases) to an import or require.
module.exports = {
  tier: "T3",
  verify(ctx) {
    const { ts, sourceFile, checker } = ctx;
    const ev = [];
    let bad = 0;
    const where = (n) => sourceFile.getLineAndCharacterOfPosition(n.getStart(sourceFile));
    const push = (n, kind) => {
      const p = where(n);
      ev.push({ line: p.line + 1, column: p.character + 1, node_kind: kind, text: n.getText(sourceFile).split("\n")[0] });
    };
    const strip = (e) => {
      while (e && (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isNonNullExpression(e)
        || ts.isTypeAssertionExpression(e) || (ts.isSatisfiesExpression && ts.isSatisfiesExpression(e)))) e = e.expression;
      return e;
    };
    const isRequireCall = (e) => {
      e = strip(e);
      return !!e && ts.isCallExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === "require"
        && e.arguments.length === 1 && ts.isStringLiteralLike(e.arguments[0]);
    };
    const declOf = (id) => {
      const sym = checker.getSymbolAtLocation(id);
      return sym && sym.declarations && sym.declarations.length ? sym.declarations[0] : undefined;
    };
    const propName = (n) => (n && (ts.isIdentifier(n) || ts.isStringLiteralLike(n)) ? n.text : undefined);

    // Is identifier `id` bound to a module namespace (import * as ns / import ns = require / const ns = require(...))?
    const isModuleObject = (id, depth) => {
      if (depth > 8) return false;
      const d = declOf(id);
      if (!d) return false;
      if (ts.isNamespaceImport(d)) return true;
      if (ts.isImportClause(d)) return true; // default import of the container module object
      if (ts.isImportEqualsDeclaration(d)) return ts.isExternalModuleReference(d.moduleReference);
      if (ts.isVariableDeclaration(d) && ts.isIdentifier(d.name) && d.initializer) {
        const init = strip(d.initializer);
        if (isRequireCall(init)) return true;
        if (ts.isIdentifier(init)) return isModuleObject(init, depth + 1);
      }
      return false;
    };

    // Does expression `e` denote the module export `getIt`?
    const isLocator = (e, depth) => {
      e = strip(e);
      if (!e || depth > 8) return false;
      if (ts.isIdentifier(e)) {
        const d = declOf(e);
        if (!d) return false;
        if (ts.isImportSpecifier(d)) return (propName(d.propertyName) || d.name.text) === "getIt";
        if (ts.isBindingElement(d)) {
          const name = propName(d.propertyName) || (ts.isIdentifier(d.name) ? d.name.text : undefined);
          if (name !== "getIt") return false;
          const pat = d.parent;
          const decl = pat && pat.parent;
          if (!decl || !ts.isVariableDeclaration(decl) || !decl.initializer || pat !== decl.name) return false;
          const init = strip(decl.initializer);
          return isRequireCall(init) || (ts.isIdentifier(init) && isModuleObject(init, depth + 1));
        }
        if (ts.isVariableDeclaration(d) && ts.isIdentifier(d.name) && d.initializer) {
          return isLocator(d.initializer, depth + 1);
        }
        return false;
      }
      if (ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e)) {
        const name = ts.isPropertyAccessExpression(e) ? e.name.text : propName(e.argumentExpression);
        if (name !== "getIt") return false;
        const obj = strip(e.expression);
        if (isRequireCall(obj)) return true;
        return ts.isIdentifier(obj) && isModuleObject(obj, depth + 1);
      }
      return false;
    };

    // Is decorator expression an `injectable` imported from a module?
    const isInjectable = (dec) => {
      let e = strip(dec.expression);
      if (ts.isCallExpression(e)) e = strip(e.expression);
      if (ts.isIdentifier(e)) {
        const d = declOf(e);
        if (!d) return false;
        if (ts.isImportSpecifier(d)) return (propName(d.propertyName) || d.name.text) === "injectable";
        if (ts.isBindingElement(d)) {
          const name = propName(d.propertyName) || (ts.isIdentifier(d.name) ? d.name.text : undefined);
          const decl = d.parent && d.parent.parent;
          return name === "injectable" && !!decl && ts.isVariableDeclaration(decl) && !!decl.initializer
            && (isRequireCall(decl.initializer) || (ts.isIdentifier(strip(decl.initializer)) && isModuleObject(strip(decl.initializer), 0)));
        }
        return false;
      }
      if (ts.isPropertyAccessExpression(e)) {
        const obj = strip(e.expression);
        return e.name.text === "injectable" && ts.isIdentifier(obj) && isModuleObject(obj, 0);
      }
      return false;
    };

    const decoratorsOf = (n) => (ts.canHaveDecorators && ts.canHaveDecorators(n) ? (ts.getDecorators(n) || []) : []);

    const visit = (n) => {
      if (ts.isClassDeclaration(n) || ts.isClassExpression(n)) {
        const dec = decoratorsOf(n).find(isInjectable);
        if (dec) push(dec, "Decorator:injectable");
      }
      if (ts.isCallExpression(n)) {
        const callee = strip(n.expression);
        let hit = isLocator(callee, 0);
        if (!hit && (ts.isPropertyAccessExpression(callee) || ts.isElementAccessExpression(callee))) {
          hit = isLocator(callee.expression, 0);
        }
        if (hit) {
          bad += 1;
          push(n, "CallExpression:getIt-locator");
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sourceFile);
    if (ev.length === 0) return { outcome: "NOT_APPLICABLE", evidence: [] };
    return { outcome: bad ? "VIOLATED" : "SATISFIED", evidence: ev };
  },
};
