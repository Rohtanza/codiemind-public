// R19_35 (T3): "Use useContext for shared state across components."
// Governed construct: one consumption of shared state in a component/hook:
//   - a call to React's useContext (conforming), however reached: named import (aliased or not),
//     default/namespace import member (React.useContext, R.useContext), require() bindings,
//     or a same-file alias of any of those;
//   - a <Ctx.Consumer> render-prop element (violating);
//   - a class `static contextType` / legacy `static contextTypes` (violating);
//   - React 19 `use(Ctx)` on a context created by createContext (violating: not useContext);
//   - a global-store hook from react-redux / jotai / recoil / zustand (violating), including
//     when imported under the local name `useContext`, and zustand hooks made by `create(...)`.
// Identity is decided by binding (checker symbol -> import/require declaration), not spelling.
module.exports = {
  tier: "T3",
  verify(ctx) {
    const { ts, sourceFile, checker } = ctx;
    const ev = [];
    let bad = 0;
    const where = (n) => sourceFile.getLineAndCharacterOfPosition(n.getStart(sourceFile));
    const add = (n, kind, isBad) => {
      if (isBad) bad += 1;
      const p = where(n);
      ev.push({ line: p.line + 1, column: p.character + 1, node_kind: kind,
        text: n.getText(sourceFile).split("\n")[0] });
    };

    const STORE_HOOKS = {
      "react-redux": ["useSelector", "useStore", "useDispatch"],
      "jotai": ["useAtom", "useAtomValue", "useSetAtom", "useStore"],
      "jotai/react": ["useAtom", "useAtomValue", "useSetAtom", "useStore"],
      "recoil": ["useRecoilState", "useRecoilValue", "useSetRecoilState", "useRecoilValueLoadable",
        "useRecoilStateLoadable", "useResetRecoilState", "useRecoilCallback"],
      "zustand": ["useStore"],
      "zustand/traditional": ["useStoreWithEqualityFn"],
    };
    const ZUSTAND_FACTORIES = ["create", "createWithEqualityFn", "default"];
    const isZustand = (m) => m === "zustand" || m.indexOf("zustand/") === 0;

    const requireModule = (e) => {
      if (e && ts.isCallExpression(e) && ts.isIdentifier(e.expression) &&
          e.expression.text === "require" && e.arguments.length === 1 &&
          ts.isStringLiteralLike(e.arguments[0])) return e.arguments[0].text;
      return undefined;
    };

    // origin: { module, name } where name undefined means the module namespace/default object
    const originOfExpr = (e, depth) => {
      if (!e || depth > 10) return undefined;
      while (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isNonNullExpression(e) ||
             (ts.isSatisfiesExpression && ts.isSatisfiesExpression(e))) e = e.expression;
      const rm = requireModule(e);
      if (rm !== undefined) return { module: rm, name: undefined };
      if (ts.isIdentifier(e)) return originOfIdent(e, depth + 1);
      if (ts.isPropertyAccessExpression(e)) {
        const base = originOfExpr(e.expression, depth + 1);
        if (base && base.name === undefined) return { module: base.module, name: e.name.text };
        if (base && base.name === "default") return { module: base.module, name: e.name.text };
      }
      return undefined;
    };
    const originOfIdent = (id, depth) => {
      if (depth > 10) return undefined;
      const sym = checker.getSymbolAtLocation(id);
      if (!sym) return undefined;
      return originOfDecl((sym.declarations || [])[0], depth);
    };
    const originOfDecl = (d, depth) => {
      if (!d || depth > 10) return undefined;
      if (ts.isImportSpecifier(d)) {
        const decl = d.parent.parent.parent;
        if (!ts.isStringLiteral(decl.moduleSpecifier)) return undefined;
        return { module: decl.moduleSpecifier.text, name: (d.propertyName || d.name).text };
      }
      if (ts.isNamespaceImport(d)) {
        const decl = d.parent.parent;
        return ts.isStringLiteral(decl.moduleSpecifier) ? { module: decl.moduleSpecifier.text, name: undefined } : undefined;
      }
      if (ts.isImportClause(d)) {
        const decl = d.parent;
        return ts.isStringLiteral(decl.moduleSpecifier) ? { module: decl.moduleSpecifier.text, name: undefined, isDefault: true } : undefined;
      }
      if (ts.isImportEqualsDeclaration(d)) {
        const r = d.moduleReference;
        if (ts.isExternalModuleReference(r) && ts.isStringLiteral(r.expression)) return { module: r.expression.text, name: undefined };
        return undefined;
      }
      if (ts.isVariableDeclaration(d) && ts.isIdentifier(d.name) && d.initializer) {
        return originOfExpr(d.initializer, depth + 1);
      }
      if (ts.isBindingElement(d) && ts.isObjectBindingPattern(d.parent)) {
        const holder = d.parent.parent;
        if (!ts.isVariableDeclaration(holder) || !holder.initializer) return undefined;
        const base = originOfExpr(holder.initializer, depth + 1);
        const key = d.propertyName || d.name;
        if (base && base.name === undefined && ts.isIdentifier(key)) return { module: base.module, name: key.text };
      }
      return undefined;
    };

    const isReactUseContext = (o) => !!o && o.module === "react" && o.name === "useContext";
    const isStoreHook = (o) => !!o && o.name !== undefined && (STORE_HOOKS[o.module] || []).indexOf(o.name) >= 0;

    // zustand: `const useX = create(...)` or `create<T>()(...)` from zustand
    const isZustandHookIdent = (id) => {
      const sym = checker.getSymbolAtLocation(id);
      const d = sym && (sym.declarations || [])[0];
      if (!d || !ts.isVariableDeclaration(d) || !d.initializer) return false;
      let e = d.initializer;
      while (ts.isCallExpression(e)) e = e.expression;
      const o = originOfExpr(e, 0);
      return !!o && isZustand(o.module) && ZUSTAND_FACTORIES.indexOf(o.name === undefined ? "default" : o.name) >= 0;
    };

    // a value created by React's createContext (for `use(Ctx)` detection)
    const isContextObject = (e) => {
      if (!e || !ts.isIdentifier(e)) return false;
      const sym = checker.getSymbolAtLocation(e);
      const d = sym && (sym.declarations || [])[0];
      if (!d || !ts.isVariableDeclaration(d) || !d.initializer || !ts.isCallExpression(d.initializer)) return false;
      const o = originOfExpr(d.initializer.expression, 0);
      return !!o && o.module === "react" && o.name === "createContext";
    };

    const visit = (n) => {
      if (ts.isCallExpression(n)) {
        const callee = n.expression;
        const o = originOfExpr(callee, 0);
        if (isReactUseContext(o)) add(n, "CallExpression:react-useContext", false);
        else if (isStoreHook(o)) add(n, "CallExpression:store-hook(" + o.module + ")", true);
        else if (o && o.module === "react" && o.name === "use" && n.arguments.length === 1 && isContextObject(n.arguments[0]))
          add(n, "CallExpression:react-use(context)", true);
        else if (ts.isIdentifier(callee) && isZustandHookIdent(callee)) add(n, "CallExpression:store-hook(zustand)", true);
      } else if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) {
        const tag = n.tagName;
        if (ts.isPropertyAccessExpression(tag) && tag.name.text === "Consumer") add(n, "JsxElement:Context.Consumer", true);
      } else if (ts.isPropertyDeclaration(n) && n.name && ts.isIdentifier(n.name) &&
                 (n.name.text === "contextType" || n.name.text === "contextTypes") &&
                 (ts.getCombinedModifierFlags(n) & ts.ModifierFlags.Static)) {
        add(n, "PropertyDeclaration:static-" + n.name.text, true);
      } else if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
                 ts.isPropertyAccessExpression(n.left) &&
                 (n.left.name.text === "contextType" || n.left.name.text === "contextTypes") &&
                 ts.isIdentifier(n.left.expression)) {
        // `MyClass.contextType = Ctx` assigned outside a class body
        const sym = checker.getSymbolAtLocation(n.left.expression);
        const d = sym && (sym.declarations || [])[0];
        if (d && (ts.isClassDeclaration(d) || ts.isClassExpression(d))) add(n, "Assignment:" + n.left.name.text, true);
      }
      ts.forEachChild(n, visit);
    };
    visit(sourceFile);
    if (ev.length === 0) return { outcome: "NOT_APPLICABLE", evidence: [] };
    return { outcome: bad ? "VIOLATED" : "SATISFIED", evidence: ev };
  },
};
