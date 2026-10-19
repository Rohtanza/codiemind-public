// R18_27 (T3): "When creating template refs that reference a Vue Component always name them with
// the `ComponentRef` suffix." Governed construct: a variable declaration whose initializer is a
// call to ref / shallowRef / useTemplateRef imported from 'vue' (named or namespace import, aliases
// followed) whose type argument contains InstanceType<typeof X> -- written inline or through
// type aliases, which are followed -- where X is bound to a Vue component: a default import from
// a '.vue' module, or a variable initialised by defineComponent(...) from 'vue' (local aliases
// such as `const Y = X` followed). DOM-element refs, state refs and refs to non-Vue class
// instances (e.g. chart.js Chart) are not governed. Conforming name: identifier ends with
// 'ComponentRef'. Binding is resolved with the checker (falls back to a scope walk when the
// checker yields no symbol, e.g. for unresolved module imports).
module.exports = {
  tier: "T3",
  verify(ctx) {
    const { ts, sourceFile, checker } = ctx;
    const ev = [];
    let bad = 0;
    const where = (n) => sourceFile.getLineAndCharacterOfPosition(n.getStart(sourceFile));
    const VUE_REF_FNS = ["ref", "shallowRef", "useTemplateRef"];

    // ---- binding resolution -------------------------------------------------------------
    const declsOf = (id) => {
      let sym;
      try { sym = checker.getSymbolAtLocation(id); } catch (e) { sym = undefined; }
      if (sym && sym.declarations && sym.declarations.length) return sym.declarations;
      // fallback: nearest enclosing declaration with this name (scope walk)
      const name = id.text;
      const found = [];
      const scan = (n) => {
        if ((ts.isImportClause(n) && n.name && n.name.text === name) ||
            (ts.isImportSpecifier(n) && n.name.text === name) ||
            (ts.isNamespaceImport(n) && n.name.text === name) ||
            (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === name) ||
            (ts.isTypeAliasDeclaration(n) && n.name.text === name) ||
            (ts.isFunctionDeclaration(n) && n.name && n.name.text === name) ||
            (ts.isClassDeclaration(n) && n.name && n.name.text === name) ||
            (ts.isParameter(n) && ts.isIdentifier(n.name) && n.name.text === name)) {
          found.push(n);
        }
        ts.forEachChild(n, scan);
      };
      let scope = id.parent;
      while (scope) {
        if (ts.isSourceFile(scope) || ts.isBlock(scope) || ts.isFunctionLike(scope) || ts.isModuleBlock(scope)) {
          const before = found.length;
          // only direct declarations of this scope level: scan, then keep those whose nearest
          // block/function ancestor is this scope (or import declarations at file level)
          scan(scope);
          const own = found.splice(before).filter((d) => {
            let p = d.parent;
            while (p && !(ts.isSourceFile(p) || ts.isBlock(p) || ts.isFunctionLike(p) || ts.isModuleBlock(p))) p = p.parent;
            if (ts.isParameter(d)) return d.parent === scope;
            return p === scope;
          });
          if (own.length) return own;
        }
        scope = scope.parent;
      }
      return [];
    };
    const importOf = (d) => {
      let p = d;
      while (p && !ts.isImportDeclaration(p)) p = p.parent;
      return p && ts.isStringLiteral(p.moduleSpecifier) ? p.moduleSpecifier.text : undefined;
    };
    // does identifier `id` denote the export `exportName` of module 'vue'?
    const isVueExport = (expr, names, depth) => {
      if ((depth || 0) > 8 || !expr) return false;
      while (ts.isParenthesizedExpression(expr) || ts.isAsExpression(expr) || ts.isNonNullExpression(expr)) expr = expr.expression;
      if (ts.isPropertyAccessExpression(expr)) {
        if (!names.includes(expr.name.text)) return false;
        const base = expr.expression;
        if (!ts.isIdentifier(base)) return false;
        return declsOf(base).some((d) => ts.isNamespaceImport(d) && importOf(d) === "vue");
      }
      if (!ts.isIdentifier(expr)) return false;
      return declsOf(expr).some((d) => {
        if (ts.isImportSpecifier(d)) {
          const orig = (d.propertyName || d.name).text;
          return importOf(d) === "vue" && names.includes(orig);
        }
        if (ts.isVariableDeclaration(d) && d.initializer && !d.type && ts.isIdentifier(d.name)) {
          return isVueExport(d.initializer, names, (depth || 0) + 1);
        }
        if (ts.isBindingElement(d) && ts.isIdentifier(d.name)) {
          // const { ref: r } = vueNamespace
          const prop = d.propertyName && ts.isIdentifier(d.propertyName) ? d.propertyName.text : d.name.text;
          const pat = d.parent;
          const vd = pat && pat.parent;
          if (names.includes(prop) && vd && ts.isVariableDeclaration(vd) && vd.initializer && ts.isIdentifier(vd.initializer)) {
            return declsOf(vd.initializer).some((x) => ts.isNamespaceImport(x) && importOf(x) === "vue");
          }
        }
        return false;
      });
    };
    // is the value identifier `id` bound to a Vue component definition?
    const isComponentValue = (expr, depth) => {
      if (depth > 8 || !expr) return false;
      while (ts.isParenthesizedExpression(expr) || ts.isAsExpression(expr) || ts.isNonNullExpression(expr) || ts.isSatisfiesExpression(expr)) expr = expr.expression;
      if (ts.isCallExpression(expr)) return isVueExport(expr.expression, ["defineComponent", "defineAsyncComponent"], 0);
      if (!ts.isIdentifier(expr)) return false;
      return declsOf(expr).some((d) => {
        if (ts.isImportClause(d)) { const m = importOf(d); return !!m && /\.vue$/.test(m); }
        if (ts.isImportSpecifier(d)) {
          const m = importOf(d);
          return !!m && /\.vue$/.test(m) && (d.propertyName || d.name).text === "default";
        }
        if (ts.isVariableDeclaration(d) && d.initializer) return isComponentValue(d.initializer, depth + 1);
        if (ts.isExportAssignment(d)) return isComponentValue(d.expression, depth + 1);
        return false;
      });
    };
    // does type node `t` denote (or contain) the instance type of a Vue component?
    const isComponentInstanceType = (t, inInstance, depth) => {
      if (!t || depth > 12) return false;
      if (ts.isTypeQueryNode(t)) {
        if (!inInstance) return false;
        let e = t.exprName;
        if (!ts.isIdentifier(e)) return false;
        return isComponentValue(e, 0);
      }
      if (ts.isTypeReferenceNode(t)) {
        const tn = t.typeName;
        const nameText = ts.isIdentifier(tn) ? tn.text : tn.right.text;
        const args = t.typeArguments || [];
        if (nameText === "InstanceType" && args.length === 1) {
          // InstanceType must be the lib one (not a local alias/redefinition)
          const local = ts.isIdentifier(tn) ? declsOf(tn).filter((d) => d.getSourceFile() === sourceFile) : [];
          if (local.length === 0) return isComponentInstanceType(args[0], true, depth + 1);
        }
        if (ts.isIdentifier(tn)) {
          const decls = declsOf(tn).filter((d) => d.getSourceFile() === sourceFile);
          for (const d of decls) {
            if (ts.isTypeAliasDeclaration(d) && isComponentInstanceType(d.type, inInstance, depth + 1)) return true;
          }
        }
        return args.some((a) => isComponentInstanceType(a, inInstance && false, depth + 1));
      }
      let hit = false;
      ts.forEachChild(t, (c) => { if (!hit && isComponentInstanceType(c, inInstance, depth + 1)) hit = true; });
      return hit;
    };

    const visit = (n) => {
      if (ts.isVariableDeclaration(n) && n.initializer) {
        let init = n.initializer;
        while (ts.isParenthesizedExpression(init) || ts.isAsExpression(init) || ts.isNonNullExpression(init) || ts.isSatisfiesExpression(init)) init = init.expression;
        if (ts.isCallExpression(init) && init.typeArguments && init.typeArguments.length > 0 &&
            isVueExport(init.expression, VUE_REF_FNS, 0) &&
            isComponentInstanceType(init.typeArguments[0], false, 0)) {
          const ok = ts.isIdentifier(n.name) && /ComponentRef$/.test(n.name.text);
          if (!ok) bad += 1;
          const p = where(n);
          ev.push({
            line: p.line + 1, column: p.character + 1,
            node_kind: ok ? "VariableDeclaration:component-template-ref:conforming" : "VariableDeclaration:component-template-ref:non-conforming",
            text: n.getText(sourceFile).split("\n")[0],
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
