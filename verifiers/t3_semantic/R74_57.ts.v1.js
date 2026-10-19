// R74_57 (T3): "Implement PouchDB for offline data."
// Governed construct: a client-side local/offline data store in the unit. Instances are:
//   - `new X(...)` where X is bound to the pouchdb default export (conforming),
//   - `new X(...)` / calls rooted in an identifier bound to an import or require of another
//     local-persistence library (dexie, idb, idb-keyval, localforage, rxdb, ...), including
//     `new Sub()` of a class that extends such a binding (violating),
//   - calls on the platform `localStorage` / `sessionStorage` / `indexedDB` (resolved by the
//     checker to a default-library declaration, so a local variable with that name is not one),
//   - `new X(...)` where X is spelled like PouchDB but is NOT bound to the pouchdb package
//     (a local class or wrapper) (violating).
// PouchDB plugin registration, sync and remote URLs are part of conforming use and are not
// separate instances. Binding is resolved through the checker symbol and its declaration
// (import clause, import-equals, require initializer, or a local alias chain).
module.exports = {
  tier: "T3",
  verify(ctx) {
    const { ts, sourceFile, checker, program } = ctx;
    const POUCH = ["pouchdb", "pouchdb-browser", "pouchdb-core", "pouchdb-node"];
    const STORAGE = [
      "dexie", "idb", "idb-keyval", "localforage", "rxdb", "lokijs", "lowdb", "nedb",
      "@nozbe/watermelondb", "@react-native-async-storage/async-storage", "@capacitor/preferences",
      "@capacitor/storage", "@ionic/storage", "store", "store2", "sql.js", "absurd-sql",
      "@sqlite.org/sqlite-wasm", "dexie-react-hooks", "idb-keyval/dist/index.js",
    ];
    const isStorageMod = (m) =>
      STORAGE.includes(m) || /^rxdb(\/|$)/.test(m) || /^dexie(\/|$)/.test(m) ||
      /^@nozbe\/watermelondb(\/|$)/.test(m) || /^lowdb(\/|$)/.test(m);
    const isPouchMod = (m) => POUCH.includes(m);
    const PLATFORM = ["localStorage", "sessionStorage", "indexedDB"];

    const ev = [];
    let bad = 0;
    const where = (n) => sourceFile.getLineAndCharacterOfPosition(n.getStart(sourceFile));
    const push = (n, kind, isBad) => {
      const p = where(n);
      if (isBad) bad += 1;
      ev.push({ line: p.line + 1, column: p.character + 1, node_kind: kind,
        text: n.getText(sourceFile).split("\n")[0].slice(0, 200) });
    };
    const isLib = (sym) => !!sym && (sym.declarations || []).some(
      (d) => program.isSourceFileDefaultLibrary(d.getSourceFile()));

    const root = (e) => {
      for (let i = 0; e && i < 64; i++) {
        if (ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e) ||
            ts.isCallExpression(e) || ts.isNonNullExpression(e) ||
            ts.isParenthesizedExpression(e) || ts.isAsExpression(e) ||
            ts.isTypeAssertionExpression(e) || ts.isAwaitExpression(e)) e = e.expression;
        else break;
      }
      return e && ts.isIdentifier(e) ? e : undefined;
    };
    const requireModule = (init) => {
      // require('m'), require('m').default, (await import('m')).default
      let e = init;
      for (let i = 0; e && i < 8; i++) {
        if (ts.isPropertyAccessExpression(e) || ts.isParenthesizedExpression(e) ||
            ts.isAwaitExpression(e) || ts.isAsExpression(e)) e = e.expression;
        else break;
      }
      if (e && ts.isCallExpression(e) && e.arguments.length >= 1 &&
          ts.isStringLiteralLike(e.arguments[0]) &&
          ((ts.isIdentifier(e.expression) && e.expression.text === "require") ||
           e.expression.kind === ts.SyntaxKind.ImportKeyword)) return e.arguments[0].text;
      return undefined;
    };

    // Returns { mod, decl } describing what an identifier is ultimately bound to.
    const bindingOf = (id, depth) => {
      if (!id || depth > 8) return undefined;
      const sym = checker.getSymbolAtLocation(id);
      if (!sym) return undefined;
      if (isLib(sym)) return { lib: sym.getName() };
      for (const d of sym.declarations || []) {
        let p = d;
        while (p && !ts.isImportDeclaration(p) && !ts.isImportEqualsDeclaration(p) &&
               !ts.isSourceFile(p)) {
          if (ts.isVariableDeclaration(p) || ts.isClassDeclaration(p) ||
              ts.isFunctionDeclaration(p) || ts.isParameter(p)) break;
          p = p.parent;
        }
        if (p && ts.isImportDeclaration(p) && ts.isStringLiteral(p.moduleSpecifier)) {
          return { mod: p.moduleSpecifier.text, decl: d };
        }
        if (p && ts.isImportEqualsDeclaration(p) &&
            ts.isExternalModuleReference(p.moduleReference) &&
            ts.isStringLiteralLike(p.moduleReference.expression)) {
          return { mod: p.moduleReference.expression.text, decl: d };
        }
        const vd = ts.isBindingElement(d) ? d : ts.isVariableDeclaration(d) ? d : undefined;
        if (vd) {
          let v = vd;
          while (v && ts.isBindingElement(v)) v = v.parent && v.parent.parent;
          if (v && ts.isVariableDeclaration(v) && v.initializer) {
            const m = requireModule(v.initializer);
            if (m) return { mod: m, decl: d };
            if (ts.isVariableDeclaration(d)) {
              const r = root(d.initializer);
              if (r) {
                const b = bindingOf(r, depth + 1);
                if (b) return b;
              }
            }
          }
          return { local: d };
        }
        return { local: d };
      }
      return undefined;
    };

    // Does a class declaration/expression extend something bound to a storage library?
    const classStorageMod = (d, depth) => {
      if (!d || depth > 8) return undefined;
      let cls = d;
      if (ts.isVariableDeclaration(d) && d.initializer && ts.isClassExpression(d.initializer)) cls = d.initializer;
      if (!(ts.isClassDeclaration(cls) || ts.isClassExpression(cls))) return undefined;
      for (const h of cls.heritageClauses || []) {
        if (h.token !== ts.SyntaxKind.ExtendsKeyword) continue;
        for (const t of h.types) {
          const r = root(t.expression);
          const b = r && bindingOf(r, depth + 1);
          if (b && b.mod && (isStorageMod(b.mod) || isPouchMod(b.mod))) return b.mod;
          if (b && b.local) {
            const m = classStorageMod(b.local, depth + 1);
            if (m) return m;
          }
        }
      }
      return undefined;
    };

    const platformObj = (e) => {
      // e is the object of a member call; is it the platform localStorage/sessionStorage/indexedDB?
      for (let i = 0; e && i < 8; i++) {
        if (ts.isParenthesizedExpression(e) || ts.isNonNullExpression(e) || ts.isAsExpression(e)) e = e.expression;
        else break;
      }
      let nameNode;
      if (ts.isIdentifier(e)) nameNode = e;
      else if (ts.isPropertyAccessExpression(e)) nameNode = e.name;
      else return undefined;
      let sym = checker.getSymbolAtLocation(nameNode);
      for (let i = 0; sym && i < 8; i++) {
        if (isLib(sym)) return PLATFORM.includes(sym.getName()) ? sym.getName() : undefined;
        const d = (sym.declarations || [])[0];
        if (d && ts.isVariableDeclaration(d) && d.initializer && !d.type) {
          const init = d.initializer;
          sym = checker.getSymbolAtLocation(ts.isPropertyAccessExpression(init) ? init.name : init);
        } else return undefined;
      }
      return undefined;
    };

    const visit = (n) => {
      if (ts.isNewExpression(n)) {
        const r = root(n.expression);
        const b = r && bindingOf(r, 0);
        if (b && b.mod && isPouchMod(b.mod)) {
          push(n, "NewExpression:pouchdb", false);
        } else if (b && b.mod && isStorageMod(b.mod)) {
          push(n, "NewExpression:storage-lib:" + b.mod, true);
        } else if (b && b.local && classStorageMod(b.local, 0)) {
          const m = classStorageMod(b.local, 0);
          if (isPouchMod(m)) push(n, "NewExpression:pouchdb-subclass", false);
          else push(n, "NewExpression:storage-subclass:" + m, true);
        } else if (r && /pouch/i.test(r.text)) {
          push(n, "NewExpression:unbound-PouchDB-lookalike", true);
        }
      } else if (ts.isCallExpression(n)) {
        const callee = n.expression;
        const r = root(callee);
        const b = r && bindingOf(r, 0);
        if (b && b.mod && isStorageMod(b.mod) && !(n.parent && ts.isNewExpression(n.parent) && n.parent.expression === n)) {
          // skip calls nested inside a callee chain already counted (only the outermost-root call counts once)
          if (!(ts.isPropertyAccessExpression(n.parent) || ts.isElementAccessExpression(n.parent)) ||
              !(n.parent.parent && ts.isCallExpression(n.parent.parent) && n.parent.parent.expression === n.parent)) {
            push(n, "CallExpression:storage-lib:" + b.mod, true);
          }
        } else if ((ts.isPropertyAccessExpression(callee) || ts.isElementAccessExpression(callee))) {
          const pf = platformObj(callee.expression);
          if (pf) push(n, "CallExpression:platform-" + pf, true);
        }
      } else if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
                 (ts.isPropertyAccessExpression(n.left) || ts.isElementAccessExpression(n.left))) {
        // localStorage.key = value / localStorage['key'] = value
        const pf = platformObj(n.left.expression);
        if (pf && pf !== "indexedDB") push(n, "BinaryExpression:platform-" + pf + "-write", true);
      }
      ts.forEachChild(n, visit);
    };
    visit(sourceFile);
    if (ev.length === 0) return { outcome: "NOT_APPLICABLE", evidence: [] };
    return { outcome: bad ? "VIOLATED" : "SATISFIED", evidence: ev };
  },
};
