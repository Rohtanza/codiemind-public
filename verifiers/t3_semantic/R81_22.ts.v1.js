// R81_22 (T3): "Use Vue." Governed construct: use of a front-end UI/reactivity framework in the
// unit -- a static import / export-from / import-equals, a dynamic import(), or a call to the
// (unbound, global) `require` of a UI-framework package, and every JSX expression, whose
// framework is the one its factory resolves to. Vue-ecosystem packages conform; any other UI
// framework (React, Preact, Svelte, Solid, Angular, Lit, ...) violates. JSX resolution order:
// `@jsxImportSource` pragma > `@jsx <factory>` pragma (factory root resolved through its
// import binding) > ambient compilerOptions.jsxImportSource > the frameworks the unit imports
// (Vue's JSX plugin when only Vue is imported) > compilerOptions.jsxFactory > the TypeScript
// default factory React.createElement. `require` is the global only when the checker finds no
// declaration of it in this unit.
module.exports = {
  tier: "T3",
  verify(ctx) {
    const { ts, sourceFile, checker, ambient } = ctx;
    const text = sourceFile.getFullText();
    const ev = [];
    let bad = 0;
    const where = (n) => sourceFile.getLineAndCharacterOfPosition(n.getStart(sourceFile));
    const snippet = (n) => n.getText(sourceFile).split("\n")[0].slice(0, 160);

    const pkgName = (spec) => {
      if (typeof spec !== "string" || spec.length === 0) return null;
      if (spec.startsWith(".") || spec.startsWith("/")) return null;
      const s = spec.startsWith("npm:") ? spec.slice(4) : spec;
      const parts = s.split("/");
      if (s.startsWith("@")) return parts.length >= 2 ? parts[0] + "/" + parts[1] : null;
      return parts[0];
    };
    const VUE_EXACT = ["vue", "vue-router", "pinia", "vuex", "nuxt", "vue-demi", "vue-i18n", "vuetify", "quasar"];
    const VUE_SCOPES = ["@vue", "@vueuse", "@nuxt", "@pinia", "@vitejs/plugin-vue", "@vitejs/plugin-vue-jsx"];
    const OTHER = [
      ["react", ["react", "react-dom", "react-native", "next", "react-router", "react-router-dom", "react-redux", "mobx-react", "mobx-react-lite", "jotai", "recoil", "zustand"], ["@react-", "@remix-run", "@reduxjs"]],
      ["preact", ["preact", "preact-render-to-string"], ["@preact"]],
      ["svelte", ["svelte", "svelte-kit"], ["@sveltejs"]],
      ["solid", ["solid-js"], ["@solidjs"]],
      ["angular", [], ["@angular"]],
      ["lit", ["lit", "lit-element", "lit-html"], ["@lit"]],
      ["mithril", ["mithril"], []],
      ["inferno", ["inferno"], []],
      ["hyperapp", ["hyperapp"], []],
      ["qwik", [], ["@builder.io/qwik"]],
      ["alpine", ["alpinejs"], ["@alpinejs"]],
      ["ember", ["ember-source"], ["@ember", "@glimmer"]],
      ["stencil", [], ["@stencil/core"]],
      ["knockout", ["knockout"], []],
      ["marko", ["marko"], ["@marko"]],
    ];
    // returns "vue", another framework name, or null (not a UI framework)
    const classify = (spec) => {
      const p = pkgName(spec);
      if (!p) return null;
      const scope = p.startsWith("@") ? p.split("/")[0] : null;
      const local = p.startsWith("@") ? p.split("/")[1] || "" : p;
      if (VUE_EXACT.includes(p) || VUE_SCOPES.includes(p) || (scope && VUE_SCOPES.includes(scope))) return "vue";
      if (local.startsWith("vue-") || local === "vue") return "vue";
      for (const [fw, exact, scopes] of OTHER) {
        if (exact.includes(p)) return fw;
        if (scopes.some((s) => p === s || p.startsWith(s + "/") || (s.endsWith("-") && p.startsWith(s)))) return fw;
      }
      if (local === "react" || local.startsWith("react-")) return "react";
      if (local === "preact" || local.startsWith("preact-")) return "preact";
      if (local === "svelte" || local.startsWith("svelte-")) return "svelte";
      if (local.startsWith("solid-")) return "solid";
      return null;
    };

    const imported = []; // {fw, node, kind, spec}
    const localBinding = new Map(); // local identifier -> module spec
    const record = (node, kind, spec) => {
      const fw = classify(spec);
      if (fw) imported.push({ fw, node, kind, spec });
    };
    const isGlobalRequire = (id) => {
      const sym = checker.getSymbolAtLocation(id);
      if (!sym) return true;
      return !(sym.declarations || []).some((d) => d.getSourceFile() === sourceFile);
    };

    const jsxRoots = [];
    const visit = (n) => {
      if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier)) {
        const spec = n.moduleSpecifier.text;
        record(n, "ImportDeclaration", spec);
        const c = n.importClause;
        if (c) {
          if (c.name) localBinding.set(c.name.text, spec);
          const nb = c.namedBindings;
          if (nb && ts.isNamespaceImport(nb)) localBinding.set(nb.name.text, spec);
          if (nb && ts.isNamedImports(nb)) for (const el of nb.elements) localBinding.set(el.name.text, spec);
        }
      } else if (ts.isExportDeclaration(n) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) {
        record(n, "ExportDeclaration", n.moduleSpecifier.text);
      } else if (ts.isImportEqualsDeclaration(n) && ts.isExternalModuleReference(n.moduleReference)
        && ts.isStringLiteral(n.moduleReference.expression)) {
        record(n, "ImportEqualsDeclaration", n.moduleReference.expression.text);
        localBinding.set(n.name.text, n.moduleReference.expression.text);
      } else if (ts.isCallExpression(n) && n.arguments.length >= 1
        && (ts.isStringLiteral(n.arguments[0]) || ts.isNoSubstitutionTemplateLiteral(n.arguments[0]))) {
        const spec = n.arguments[0].text;
        if (n.expression.kind === ts.SyntaxKind.ImportKeyword) {
          record(n, "CallExpression:dynamic-import", spec);
        } else if (ts.isIdentifier(n.expression) && n.expression.text === "require" && isGlobalRequire(n.expression)) {
          record(n, "CallExpression:require", spec);
          const p = n.parent;
          if (p && ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) localBinding.set(p.name.text, spec);
          if (p && ts.isVariableDeclaration(p) && ts.isObjectBindingPattern(p.name)) {
            for (const el of p.name.elements) if (ts.isIdentifier(el.name)) localBinding.set(el.name.text, spec);
          }
        }
      }
      if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n) || ts.isJsxFragment(n)) {
        jsxRoots.push(n);
        return; // nested JSX belongs to this instance
      }
      ts.forEachChild(n, visit);
    };
    visit(sourceFile);

    // JSX framework resolution
    let jsxFw = null;
    let jsxVia = "";
    if (jsxRoots.length) {
      const leading = [];
      // pragmas are read from comments only (not strings)
      const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, sourceFile.languageVariant, text);
      let tok = scanner.scan();
      while (tok !== ts.SyntaxKind.EndOfFileToken) {
        if (tok === ts.SyntaxKind.SingleLineCommentTrivia || tok === ts.SyntaxKind.MultiLineCommentTrivia) {
          leading.push(scanner.getTokenText());
        }
        tok = scanner.scan();
      }
      const comments = leading.join("\n");
      const src = /@jsxImportSource\s+(\S+)/.exec(comments);
      const fac = /@jsx\s+([A-Za-z_$][\w$]*)(?:\.[\w$.]+)?/.exec(comments);
      const co = (ambient && ambient.compilerOptions) || {};
      const importFws = [...new Set(imported.map((i) => i.fw))];
      if (src) {
        jsxFw = classify(src[1].replace(/\*\/$/, "")) || "other:" + src[1];
        jsxVia = "pragma @jsxImportSource " + src[1];
      } else if (fac) {
        const root = fac[1];
        const spec = localBinding.get(root);
        jsxFw = spec ? (classify(spec) || "other:" + spec) : (root === "React" ? "react" : "other:" + root);
        jsxVia = "pragma @jsx " + root + (spec ? " from " + spec : "");
      } else if (typeof co.jsxImportSource === "string" && co.jsxImportSource) {
        jsxFw = classify(co.jsxImportSource) || "other:" + co.jsxImportSource;
        jsxVia = "compilerOptions.jsxImportSource " + co.jsxImportSource;
      } else if (importFws.length === 1 && importFws[0] === "vue") {
        jsxFw = "vue";
        jsxVia = "Vue JSX (unit binds Vue only)";
      } else if (importFws.some((f) => f !== "vue")) {
        jsxFw = importFws.find((f) => f !== "vue");
        jsxVia = "unit imports " + jsxFw;
      } else if (typeof co.jsxFactory === "string" && co.jsxFactory) {
        const root = co.jsxFactory.split(".")[0];
        const spec = localBinding.get(root);
        jsxFw = spec ? (classify(spec) || "other:" + spec) : (root === "React" ? "react" : "other:" + root);
        jsxVia = "compilerOptions.jsxFactory " + co.jsxFactory;
      } else {
        jsxFw = "react";
        jsxVia = "default factory React.createElement";
      }
    }

    for (const i of imported) {
      const p = where(i.node);
      const ok = i.fw === "vue";
      if (!ok) bad += 1;
      ev.push({ line: p.line + 1, column: p.character + 1,
        node_kind: i.kind + ":" + (ok ? "vue" : "non-vue:" + i.fw), text: snippet(i.node) });
    }
    for (const j of jsxRoots) {
      const p = where(j);
      const ok = jsxFw === "vue";
      if (!ok) bad += 1;
      ev.push({ line: p.line + 1, column: p.character + 1,
        node_kind: ts.SyntaxKind[j.kind] + ":" + (ok ? "vue" : "non-vue:" + jsxFw) + " (" + jsxVia + ")",
        text: snippet(j) });
    }
    if (ev.length === 0) return { outcome: "NOT_APPLICABLE", evidence: [] };
    return { outcome: bad ? "VIOLATED" : "SATISFIED", evidence: ev };
  },
};
