// R42_19 (T3): "Implement dark mode support using Expo's useColorScheme."
// Governed construct: a read of the system colour scheme -- a call to anything named or aliased
// useColorScheme, Appearance.getColorScheme / Appearance.addChangeListener, or
// matchMedia('(prefers-color-scheme: ...)'). Conforming: the called identifier is BOUND to the
// react-native useColorScheme hook (named/aliased import, namespace/default import member,
// require destructuring, a local alias, or a local wrapper whose body delegates to it).
// Binding is resolved with the checker (the module itself is not resolvable in the one-file
// program, so the import declaration that binds the symbol is inspected).
module.exports = {
  tier: "T3",
  verify(ctx) {
    const { ts, sourceFile, checker } = ctx;
    const ev = [];
    let bad = 0;
    const RN = "react-native";
    const where = (n) => sourceFile.getLineAndCharacterOfPosition(n.getStart(sourceFile));
    const push = (n, kind, isBad) => {
      if (isBad) bad += 1;
      const p = where(n);
      ev.push({ line: p.line + 1, column: p.character + 1, node_kind: kind,
        text: n.getText(sourceFile).split("\n")[0] });
    };
    const strip = (e) => {
      while (e && (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) ||
        ts.isNonNullExpression(e) || (ts.isSatisfiesExpression && ts.isSatisfiesExpression(e)) ||
        ts.isTypeAssertionExpression(e))) e = e.expression;
      return e;
    };
    const isRequireOf = (e, mod) => {
      e = strip(e);
      return !!e && ts.isCallExpression(e) && ts.isIdentifier(e.expression) &&
        e.expression.text === "require" && e.arguments.length > 0 &&
        ts.isStringLiteralLike(e.arguments[0]) && e.arguments[0].text === mod;
    };
    const importModule = (d) => {
      let p = d;
      while (p && !ts.isImportDeclaration(p) && !ts.isImportEqualsDeclaration(p)) p = p.parent;
      if (!p) return undefined;
      if (ts.isImportDeclaration(p)) return ts.isStringLiteral(p.moduleSpecifier) ? p.moduleSpecifier.text : undefined;
      const r = p.moduleReference;
      return ts.isExternalModuleReference(r) && ts.isStringLiteralLike(r.expression) ? r.expression.text : undefined;
    };
    const symOf = (n) => {
      let s = checker.getSymbolAtLocation(n);
      if (!s && n.parent && ts.isShorthandPropertyAssignment(n.parent)) s = checker.getShorthandAssignmentValueSymbol(n.parent);
      return s;
    };

    // Describe what an expression denotes: {kind:"rnModule"} | {kind:"rnHook"} |
    // {kind:"otherHook"} | {kind:"wrapper", fn} | {kind:"appearance"} | {kind:"unknown", name}
    const describe = (e, depth) => {
      e = strip(e);
      if (!e || depth > 10) return { kind: "unknown" };
      if (isRequireOf(e, RN)) return { kind: "rnModule" };
      if (ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e)) {
        let name;
        if (ts.isPropertyAccessExpression(e)) name = e.name.text;
        else if (ts.isStringLiteralLike(e.argumentExpression)) name = e.argumentExpression.text;
        const base = describe(e.expression, depth + 1);
        if (base.kind === "rnModule") {
          if (name === "useColorScheme") return { kind: "rnHook" };
          if (name === "Appearance") return { kind: "appearance" };
          return { kind: "unknown", name };
        }
        if (name === "Appearance") return { kind: "appearance" };
        if (name === "useColorScheme") return { kind: "otherHook" };
        return { kind: "unknown", name };
      }
      if (ts.isIdentifier(e)) return describeSym(symOf(e), e.text, depth + 1);
      if (ts.isArrowFunction(e) || ts.isFunctionExpression(e)) return { kind: "wrapper", fn: e };
      return { kind: "unknown" };
    };
    const describeSym = (sym, fallbackName, depth) => {
      if (!sym || depth > 10) {
        if (fallbackName === "useColorScheme") return { kind: "otherHook" };
        if (fallbackName === "Appearance") return { kind: "appearance" };
        return { kind: "unknown", name: fallbackName };
      }
      const d = (sym.declarations || [])[0];
      if (!d) return { kind: "unknown", name: sym.getName() };
      if (ts.isImportSpecifier(d)) {
        const imported = (d.propertyName || d.name).text;
        const mod = importModule(d);
        if (imported === "useColorScheme") return { kind: mod === RN ? "rnHook" : "otherHook" };
        if (imported === "Appearance") return { kind: "appearance" };
        if (imported === "default" && mod === RN) return { kind: "rnModule" };
        return { kind: "unknown", name: imported };
      }
      if (ts.isNamespaceImport(d) || ts.isImportClause(d) || ts.isImportEqualsDeclaration(d)) {
        return importModule(d) === RN ? { kind: "rnModule" } : { kind: "unknown", name: sym.getName() };
      }
      if (ts.isFunctionDeclaration(d)) return { kind: "wrapper", fn: d, name: sym.getName() };
      if (ts.isVariableDeclaration(d) && ts.isIdentifier(d.name)) {
        if (d.initializer) {
          const r = describe(d.initializer, depth + 1);
          if (r.kind === "wrapper") return { kind: "wrapper", fn: r.fn, name: d.name.text };
          if (r.kind !== "unknown") return r;
        }
        return { kind: "unknown", name: d.name.text };
      }
      if (ts.isBindingElement(d)) {
        const key = d.propertyName && ts.isIdentifier(d.propertyName) ? d.propertyName.text
          : d.propertyName && ts.isStringLiteralLike(d.propertyName) ? d.propertyName.text
          : ts.isIdentifier(d.name) ? d.name.text : undefined;
        let decl = d.parent && d.parent.parent;
        if (decl && ts.isVariableDeclaration(decl) && decl.initializer && ts.isObjectBindingPattern(d.parent)) {
          const base = describe(decl.initializer, depth + 1);
          if (base.kind === "rnModule") {
            if (key === "useColorScheme") return { kind: "rnHook" };
            if (key === "Appearance") return { kind: "appearance" };
          }
        }
        if (key === "useColorScheme") return { kind: "otherHook" };
        if (key === "Appearance") return { kind: "appearance" };
        return { kind: "unknown", name: key };
      }
      return { kind: "unknown", name: sym.getName() };
    };

    // Does a local wrapper's body delegate to the react-native hook?
    const delegating = new Map();
    const delegates = (fn) => {
      if (delegating.has(fn)) return delegating.get(fn);
      delegating.set(fn, false);
      let found = false;
      const walk = (n) => {
        if (found) return;
        if (ts.isCallExpression(n)) {
          const r = describe(n.expression, 0);
          if (r.kind === "rnHook" || (r.kind === "wrapper" && r.fn !== fn && delegates(r.fn))) { found = true; return; }
        }
        ts.forEachChild(n, walk);
      };
      if (fn.body) walk(fn.body);
      delegating.set(fn, found);
      return found;
    };

    const stringValue = (e, depth) => {
      e = strip(e);
      if (!e || depth > 6) return undefined;
      if (ts.isStringLiteralLike(e)) return e.text;
      if (ts.isTemplateExpression(e)) return e.getText(sourceFile);
      if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.PlusToken) {
        return (stringValue(e.left, depth + 1) || "") + (stringValue(e.right, depth + 1) || "");
      }
      if (ts.isIdentifier(e)) {
        const s = symOf(e);
        const d = s && (s.declarations || [])[0];
        if (d && ts.isVariableDeclaration(d) && d.initializer) return stringValue(d.initializer, depth + 1);
        const t = checker.getTypeAtLocation(e);
        if (t && t.isStringLiteral && t.isStringLiteral()) return t.value;
      }
      return undefined;
    };

    const visit = (n) => {
      if (ts.isCallExpression(n)) {
        const callee = strip(n.expression);
        let calledName;
        if (ts.isIdentifier(callee)) calledName = callee.text;
        else if (ts.isPropertyAccessExpression(callee)) calledName = callee.name.text;
        else if (ts.isElementAccessExpression(callee) && ts.isStringLiteralLike(callee.argumentExpression)) calledName = callee.argumentExpression.text;

        if (calledName === "matchMedia") {
          const v = n.arguments.length ? stringValue(n.arguments[0], 0) : undefined;
          if (v && /prefers-color-scheme/.test(v)) push(n, "CallExpression:matchMedia-prefers-color-scheme", true);
        } else if ((calledName === "getColorScheme" || calledName === "addChangeListener") &&
          !ts.isIdentifier(callee)) {
          const base = describe(callee.expression, 0);
          if (base.kind === "appearance") push(n, "CallExpression:Appearance." + calledName, true);
        } else {
          const r = describe(callee, 0);
          if (r.kind === "rnHook") push(n, "CallExpression:react-native-useColorScheme", false);
          else if (r.kind === "otherHook") push(n, "CallExpression:non-react-native-useColorScheme", true);
          else if (r.kind === "wrapper" && (calledName === "useColorScheme" || r.name === "useColorScheme")) {
            if (delegates(r.fn)) push(n, "CallExpression:wrapper-delegating-to-react-native-useColorScheme", false);
            else push(n, "CallExpression:local-useColorScheme-not-react-native", true);
          } else if (r.kind === "unknown" && (calledName === "useColorScheme" || r.name === "useColorScheme")) {
            push(n, "CallExpression:unresolved-useColorScheme", true);
          }
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sourceFile);
    if (ev.length === 0) return { outcome: "NOT_APPLICABLE", evidence: [] };
    return { outcome: bad ? "VIOLATED" : "SATISFIED", evidence: ev };
  },
};
