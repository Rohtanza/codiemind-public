// R74_85 (T3): "Use Firestore for scalable, real-time data storage."
// Governed construct: a data-storage use in the file —
//   (a) an import / require / dynamic import of a database or persistent-storage client module
//       whose bindings are used as VALUES (type-only uses do not count), or
//   (b) a reference to the browser Web Storage globals localStorage / sessionStorage / indexedDB
//       that the checker resolves to the default-library declaration (a local parameter or
//       variable with the same spelling is not the global).
// Firestore modules conform; every other store (Realtime Database, MongoDB, Postgres, Redis,
// Supabase, SQL ORMs, Web Storage, ...) violates. Namespace-style Firebase entry points
// (firebase-admin, firebase/compat/app) are classified by the member used: `.firestore` conforms,
// `.database` violates. Binding resolution (value vs type use, local shadowing) needs the checker.
module.exports = {
  tier: "T3",
  verify(ctx) {
    const { ts, sourceFile, checker, program } = ctx;
    const ev = [];
    let bad = 0;

    const FIRESTORE = [
      "firebase/firestore", "@firebase/firestore", "firebase-admin/firestore",
      "@google-cloud/firestore", "firebase/compat/firestore", "@react-native-firebase/firestore",
    ];
    const NAMESPACE = ["firebase-admin", "firebase", "firebase/app", "firebase/compat/app", "firebase/compat"];
    const OTHER = [
      "firebase/database", "@firebase/database", "firebase-admin/database", "firebase/compat/database",
      "@react-native-firebase/database", "mongoose", "mongodb", "pg", "pg-promise", "postgres",
      "mysql", "mysql2", "redis", "ioredis", "@redis/client", "@upstash/redis", "@supabase/supabase-js",
      "@supabase/postgrest-js", "sqlite3", "better-sqlite3", "sqlite", "@libsql/client",
      "@prisma/client", "typeorm", "sequelize", "knex", "drizzle-orm", "@mikro-orm/core", "objection",
      "@aws-sdk/client-dynamodb", "@aws-sdk/lib-dynamodb", "dynamoose", "cassandra-driver",
      "couchbase", "nano", "pouchdb", "@neondatabase/serverless", "@planetscale/database",
      "@vercel/postgres", "@vercel/kv", "idb", "idb-keyval", "localforage", "dexie",
      "@react-native-async-storage/async-storage", "realm", "lowdb", "nedb", "level", "mssql",
      "tedious", "oracledb", "neo4j-driver", "@elastic/elasticsearch", "faunadb", "rethinkdb",
      "@azure/cosmos", "convex", "pocketbase", "appwrite", "@aws-amplify/datastore",
    ];
    const matches = (spec, list) => list.some((m) => spec === m || spec.startsWith(m + "/"));
    const classify = (spec) => {
      if (matches(spec, FIRESTORE)) return "firestore";
      if (NAMESPACE.indexOf(spec) >= 0) return "namespace";
      if (matches(spec, OTHER)) return "other";
      return null;
    };
    const WEB = ["localStorage", "sessionStorage", "indexedDB"];

    const where = (n) => sourceFile.getLineAndCharacterOfPosition(n.getStart(sourceFile));
    const push = (n, kind, ok) => {
      if (!ok) bad += 1;
      const p = where(n);
      ev.push({ line: p.line + 1, column: p.character + 1, node_kind: kind,
        text: n.getText(sourceFile).split("\n")[0].slice(0, 160) });
    };
    const isLib = (sym) => !!sym && (sym.declarations || []).some(
      (d) => program.isSourceFileDefaultLibrary(d.getSourceFile()));

    // Is this identifier occurrence in a type-only position?
    const inTypePosition = (id) => {
      let c = id;
      let p = id.parent;
      while (p) {
        if (ts.isExpressionWithTypeArguments(p)) {
          const h = p.parent;
          if (h && ts.isHeritageClause(h) && h.token === ts.SyntaxKind.ExtendsKeyword &&
              h.parent && (ts.isClassDeclaration(h.parent) || ts.isClassExpression(h.parent)) &&
              c === p.expression) return false;
          return true;
        }
        if (ts.isTypeNode(p)) return true;
        if (ts.isImportDeclaration(p) || ts.isImportEqualsDeclaration(p)) return true;
        if (ts.isExportSpecifier(p)) return !!(p.isTypeOnly || (p.parent && p.parent.parent && p.parent.parent.isTypeOnly));
        if (ts.isExpression(p) || ts.isStatement(p) || ts.isSourceFile(p)) return false;
        c = p;
        p = p.parent;
      }
      return false;
    };

    // Collect binding identifiers introduced by a storage import, with their module classes.
    const bindings = []; // { name: Identifier, cls, spec }
    const addBindingName = (nameNode, cls, spec) => {
      if (!nameNode) return;
      if (ts.isIdentifier(nameNode)) { bindings.push({ name: nameNode, cls, spec }); return; }
      if (ts.isObjectBindingPattern(nameNode) || ts.isArrayBindingPattern(nameNode)) {
        nameNode.elements.forEach((e) => { if (ts.isBindingElement(e)) addBindingName(e.name, cls, spec); });
      }
    };
    const unboundUses = []; // { node, cls, spec }

    const isRequireOrImportCall = (n) =>
      ts.isCallExpression(n) && n.arguments.length >= 1 && ts.isStringLiteralLike(n.arguments[0]) &&
      (n.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(n.expression) && n.expression.text === "require"));

    const collect = (n) => {
      if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier)) {
        const spec = n.moduleSpecifier.text;
        const cls = classify(spec);
        const ic = n.importClause;
        if (cls && ic && !ic.isTypeOnly) {
          if (ic.name) addBindingName(ic.name, cls, spec);
          const nb = ic.namedBindings;
          if (nb && ts.isNamespaceImport(nb)) addBindingName(nb.name, cls, spec);
          if (nb && ts.isNamedImports(nb)) nb.elements.forEach((e) => { if (!e.isTypeOnly) addBindingName(e.name, cls, spec); });
        }
      } else if (ts.isImportEqualsDeclaration(n) && !n.isTypeOnly &&
                 ts.isExternalModuleReference(n.moduleReference) &&
                 ts.isStringLiteral(n.moduleReference.expression)) {
        const spec = n.moduleReference.expression.text;
        const cls = classify(spec);
        if (cls) addBindingName(n.name, cls, spec);
      } else if (ts.isExportDeclaration(n) && !n.isTypeOnly && n.moduleSpecifier &&
                 ts.isStringLiteral(n.moduleSpecifier)) {
        const spec = n.moduleSpecifier.text;
        const cls = classify(spec);
        if (cls && cls !== "namespace") unboundUses.push({ node: n, cls, spec });
      } else if (isRequireOrImportCall(n)) {
        const spec = n.arguments[0].text;
        const cls = classify(spec);
        if (cls) {
          // const x = require("m") / const { a } = require("m") / const x = await import("m")
          let p = n.parent;
          while (p && (ts.isAwaitExpression(p) || ts.isParenthesizedExpression(p))) p = p.parent;
          if (p && ts.isVariableDeclaration(p) && p.initializer) {
            addBindingName(p.name, cls, spec);
          } else if (cls === "namespace" && p && ts.isPropertyAccessExpression(p)) {
            const m = p.name.text;
            if (m === "firestore") push(p, "MemberAccess:firestore", true);
            else if (m === "database") push(p, "MemberAccess:realtime-database", false);
          } else if (cls !== "namespace") {
            unboundUses.push({ node: n, cls, spec });
          }
        }
      }
      ts.forEachChild(n, collect);
    };
    collect(sourceFile);

    unboundUses.forEach((u) => push(u.node, u.cls === "firestore" ? "ModuleUse:firestore" : "ModuleUse:other-store", u.cls === "firestore"));

    // Resolve bindings to their local symbols and find value references.
    const symMap = new Map(); // symbol -> binding
    bindings.forEach((b) => {
      const s = checker.getSymbolAtLocation(b.name);
      if (s) symMap.set(s, b);
    });
    const firstValueUse = new Map(); // binding -> first value-use identifier (non-namespace)
    const visit = (n) => {
      if (ts.isIdentifier(n)) {
        const sym = checker.getSymbolAtLocation(n);
        const b = sym ? symMap.get(sym) : undefined;
        if (b && n !== b.name && !inTypePosition(n)) {
          if (b.cls === "namespace") {
            const p = n.parent;
            let member;
            if (p && ts.isPropertyAccessExpression(p) && p.expression === n) member = p.name.text;
            if (member === "firestore") push(p, "MemberAccess:firestore", true);
            else if (member === "database") push(p, "MemberAccess:realtime-database", false);
          } else if (!firstValueUse.has(b)) {
            firstValueUse.set(b, n);
          }
        }
        // Web Storage globals, resolved by binding
        if (WEB.indexOf(n.text) >= 0) {
          const p = n.parent;
          const isNameOfAccess = p && ts.isPropertyAccessExpression(p) && p.name === n;
          const isDeclName = !!p && !isNameOfAccess && (
            ts.isPropertyAssignment(p) || ts.isMethodDeclaration(p) || ts.isPropertyDeclaration(p) ||
            ts.isPropertySignature(p) || ts.isVariableDeclaration(p) || ts.isParameter(p) ||
            ts.isBindingElement(p) || ts.isFunctionDeclaration(p)) && p.name === n;
          const isRefPos = !isDeclName;
          if (isRefPos && !inTypePosition(n) && !(p && ts.isTypeOfExpression(p))) {
            const s = checker.getSymbolAtLocation(n);
            if (isLib(s)) {
              const node = isNameOfAccess ? p : n;
              push(node, "WebStorage:" + n.text, false);
            }
          }
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sourceFile);

    bindings.forEach((b) => {
      const use = firstValueUse.get(b);
      if (!use) return;
      const ok = b.cls === "firestore";
      if (!ok) bad += 1;
      const p = where(use);
      ev.push({ line: p.line + 1, column: p.character + 1,
        node_kind: (ok ? "ImportBindingUse:firestore:" : "ImportBindingUse:other-store:") + b.spec,
        text: use.parent.getText(sourceFile).split("\n")[0].slice(0, 160) });
    });

    if (ev.length === 0) return { outcome: "NOT_APPLICABLE", evidence: [] };
    ev.sort((a, c) => a.line - c.line || a.column - c.column);
    return { outcome: bad ? "VIOLATED" : "SATISFIED", evidence: ev };
  },
};
