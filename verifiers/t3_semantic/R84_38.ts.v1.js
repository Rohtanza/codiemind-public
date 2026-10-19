// R84_38 (T3): "Use react-router-dom for routing."
// Governed construct: a client-side routing/navigation mechanism in the unit:
//   (a) an import / re-export / require / dynamic import of a routing package, plus every
//       identifier bound to such an import (components, hooks, navigate helpers);
//   (b) a History API navigation call (pushState / replaceState) whose method resolves, through
//       the type checker, to the DOM library's `History` interface: `window.history.pushState`,
//       global `history.replaceState`, an alias `const nav = window.history; nav.pushState(...)`,
//       or a destructured `const { pushState } = window.history`.
// Bindings to "react-router-dom" (or its subpaths) conform; any other routing package (including
// bare "react-router") or a real History API navigation call does not. A method merely named
// pushState on a local object resolves to a declaration in the unit, not the default lib, and is
// ignored. Reading window.location is not an instance. No instance -> NOT_APPLICABLE.
module.exports = {
  tier: "T3",
  verify(ctx) {
    const { ts, sourceFile, checker, program } = ctx;
    const ev = [];
    let bad = 0;

    const CONFORM = (spec) => spec === "react-router-dom" || spec.startsWith("react-router-dom/");
    const OTHER_EXACT = [
      "react-router", "react-router-native", "wouter", "wouter/preact",
      "next/router", "next/navigation", "next/link", "next/compat/router",
      "@reach/router", "@tanstack/react-router", "@tanstack/router", "@tanstack/solid-router",
      "@tanstack/vue-router", "vue-router", "@angular/router", "preact-router", "preact-iso",
      "svelte-routing", "svelte-spa-router", "@solidjs/router", "solid-app-router",
      "universal-router", "navigo", "@react-navigation/native", "@react-navigation/stack",
      "@react-navigation/native-stack", "@react-navigation/bottom-tabs", "expo-router",
      "@remix-run/router", "@tanstack/react-location", "react-location", "found", "react-router-config",
    ];
    const OTHER_PREFIX = ["react-router/", "wouter/", "@tanstack/react-router/", "@reach/router/",
      "next/dist/client/router", "@react-navigation/", "vue-router/", "@angular/router/"];
    const classify = (spec) => {
      if (CONFORM(spec)) return "conform";
      if (OTHER_EXACT.indexOf(spec) >= 0) return "other";
      if (OTHER_PREFIX.some((p) => spec.startsWith(p))) return "other";
      return null;
    };

    const where = (n) => sourceFile.getLineAndCharacterOfPosition(n.getStart(sourceFile));
    const add = (n, kind, ok) => {
      if (!ok) bad += 1;
      const p = where(n);
      ev.push({ line: p.line + 1, column: p.character + 1,
        node_kind: kind + (ok ? ":react-router-dom" : ":non-conforming"),
        text: n.getText(sourceFile).split("\n")[0].slice(0, 200) });
    };

    // --- (a) routing-package imports and the bindings they introduce ---
    const importSyms = []; // { sym, ok }
    const recordBinding = (nameNode, ok) => {
      const s = checker.getSymbolAtLocation(nameNode);
      if (s) importSyms.push({ sym: s, ok, decl: nameNode });
    };
    const isRequireLike = (call) => {
      const e = call.expression;
      if (e.kind === ts.SyntaxKind.ImportKeyword) return true;
      return ts.isIdentifier(e) && e.text === "require";
    };

    const scanModules = (n) => {
      if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier)) {
        const c = classify(n.moduleSpecifier.text);
        if (c) {
          const ok = c === "conform";
          add(n, "ImportDeclaration", ok);
          const ic = n.importClause;
          if (ic) {
            if (ic.name) recordBinding(ic.name, ok);
            const nb = ic.namedBindings;
            if (nb && ts.isNamespaceImport(nb)) recordBinding(nb.name, ok);
            if (nb && ts.isNamedImports(nb)) nb.elements.forEach((el) => recordBinding(el.name, ok));
          }
        }
      } else if (ts.isImportEqualsDeclaration(n) && ts.isExternalModuleReference(n.moduleReference)
        && ts.isStringLiteral(n.moduleReference.expression)) {
        const c = classify(n.moduleReference.expression.text);
        if (c) { add(n, "ImportEqualsDeclaration", c === "conform"); recordBinding(n.name, c === "conform"); }
      } else if (ts.isExportDeclaration(n) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) {
        const c = classify(n.moduleSpecifier.text);
        if (c) add(n, "ExportDeclaration", c === "conform");
      } else if (ts.isCallExpression(n) && isRequireLike(n) && n.arguments.length >= 1
        && ts.isStringLiteralLike(n.arguments[0])) {
        const c = classify(n.arguments[0].text);
        if (c) {
          const ok = c === "conform";
          add(n, "CallExpression:module-load", ok);
          // const X = require("pkg") / const { A, B } = require("pkg")
          let p = n.parent;
          if (p && ts.isAwaitExpression(p)) p = p.parent;
          if (p && ts.isVariableDeclaration(p) && p.initializer) {
            if (ts.isIdentifier(p.name)) recordBinding(p.name, ok);
            else if (ts.isObjectBindingPattern(p.name)) p.name.elements.forEach((el) => {
              if (ts.isIdentifier(el.name)) recordBinding(el.name, ok);
            });
          }
        }
      }
      ts.forEachChild(n, scanModules);
    };
    scanModules(sourceFile);

    // references to the imported bindings (components, hooks, navigate functions)
    if (importSyms.length) {
      const visitRefs = (n) => {
        if (ts.isIdentifier(n) && !importSyms.some((r) => r.decl === n)) {
          const s = checker.getSymbolAtLocation(n);
          let parentImport = n.parent;
          while (parentImport && !ts.isImportDeclaration(parentImport) && !ts.isImportEqualsDeclaration(parentImport)) {
            parentImport = parentImport.parent;
          }
          if (s && !parentImport) {
            const hit = importSyms.find((r) => r.sym === s);
            // skip property names of qualified accesses (X.Link is reported at X)
            const isPropName = ts.isPropertyAccessExpression(n.parent) && n.parent.name === n;
            const isClosingTag = ts.isJsxClosingElement(n.parent);
            if (hit && !isPropName && !isClosingTag) add(n, "Identifier:routing-binding", hit.ok);
          }
        }
        ts.forEachChild(n, visitRefs);
      };
      visitRefs(sourceFile);
    }

    // --- (b) History API navigation calls on the real window.history ---
    const NAV = ["pushState", "replaceState"];
    const isLibHistoryMember = (sym) => {
      if (!sym) return false;
      if (NAV.indexOf(sym.getName()) < 0) return false;
      return (sym.declarations || []).some((d) => {
        if (!program.isSourceFileDefaultLibrary(d.getSourceFile())) return false;
        const owner = d.parent;
        return !!owner && ts.isInterfaceDeclaration(owner) && owner.name.text === "History";
      });
    };
    const resolveCallee = (callee) => {
      // returns the property symbol a callee refers to, following destructuring aliases
      if (ts.isParenthesizedExpression(callee)) return resolveCallee(callee.expression);
      if (ts.isPropertyAccessExpression(callee)) return checker.getSymbolAtLocation(callee.name);
      if (ts.isElementAccessExpression(callee) && ts.isStringLiteralLike(callee.argumentExpression)) {
        const t = checker.getTypeAtLocation(callee.expression);
        return t ? t.getProperty(callee.argumentExpression.text) : undefined;
      }
      if (ts.isIdentifier(callee)) {
        let sym = checker.getSymbolAtLocation(callee);
        for (let i = 0; sym && i < 8; i++) {
          if (isLibHistoryMember(sym)) return sym;
          const d = (sym.declarations || [])[0];
          if (d && ts.isBindingElement(d) && ts.isObjectBindingPattern(d.parent)) {
            const vd = d.parent.parent;
            const name = d.propertyName || d.name;
            if (!vd || !vd.initializer || !ts.isIdentifier(name)) return sym;
            const t = checker.getTypeAtLocation(vd.initializer);
            sym = t ? t.getProperty(name.text) : undefined;
          } else if (d && ts.isVariableDeclaration(d) && d.initializer && !d.type) {
            let init = d.initializer;
            // const push = window.history.pushState.bind(window.history)
            if (ts.isCallExpression(init) && ts.isPropertyAccessExpression(init.expression)
              && init.expression.name.text === "bind") init = init.expression.expression;
            sym = resolveCallee(init);
          } else {
            return sym;
          }
        }
        return sym;
      }
      return undefined;
    };
    const visitCalls = (n) => {
      if (ts.isCallExpression(n)) {
        let callee = n.expression;
        // history.pushState.call(history, ...) / .apply(...)
        if (ts.isPropertyAccessExpression(callee) && (callee.name.text === "call" || callee.name.text === "apply")
          && ts.isPropertyAccessExpression(callee.expression) && NAV.indexOf(callee.expression.name.text) >= 0) {
          callee = callee.expression;
        }
        const sym = resolveCallee(callee);
        if (isLibHistoryMember(sym)) add(n, "CallExpression:history-api", false);
      }
      ts.forEachChild(n, visitCalls);
    };
    visitCalls(sourceFile);

    if (ev.length === 0) return { outcome: "NOT_APPLICABLE", evidence: [] };
    return { outcome: bad ? "VIOLATED" : "SATISFIED", evidence: ev };
  },
};
