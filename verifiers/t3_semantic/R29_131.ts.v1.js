// R29_131 (T3): "No console.log or debug code left."
// Governed construct: every call of a method of the built-in Console (declared in a default
// library file), however the receiver is reached (`console`, `globalThis.console`, an alias, a
// parameter typed Console, a destructured method, `.call/.apply/.bind`), plus every `debugger`
// statement. Only console.error / console.warn conform. Whether a member belongs to the
// built-in Console is decided by the checker's symbol, not by spelling: an application-defined
// interface that happens to be named Console, or a local `console` parameter of another type,
// is not an instance.
module.exports = {
  tier: "T3",
  verify(ctx) {
    const { ts, sourceFile, checker, program } = ctx;
    const ev = [];
    let bad = 0;
    const OK = new Set(["error", "warn"]);
    const where = (n) => sourceFile.getLineAndCharacterOfPosition(n.getStart(sourceFile));
    const inLib = (d) => program.isSourceFileDefaultLibrary(d.getSourceFile());
    // a symbol that is a member of the default-library `Console` interface
    const consoleMember = (sym) => {
      if (!sym) return null;
      if (sym.flags & ts.SymbolFlags.Alias) {
        try { sym = checker.getAliasedSymbol(sym); } catch (e) { /* keep */ }
      }
      const ok = (sym.declarations || []).some((d) => {
        const p = d.parent;
        return inLib(d) && p && ts.isInterfaceDeclaration(p) && p.name.text === "Console";
      });
      return ok ? sym.getName() : null;
    };
    const strip = (e) => {
      while (e && (ts.isParenthesizedExpression(e) || ts.isNonNullExpression(e) ||
        ts.isAsExpression(e) || ts.isTypeAssertionExpression(e) ||
        (ts.isSatisfiesExpression && ts.isSatisfiesExpression(e)))) e = e.expression;
      return e;
    };
    // returns the Console method name an expression denotes, or null
    const methodOf = (e, depth) => {
      e = strip(e);
      if (!e || depth > 10) return null;
      if (ts.isPropertyAccessExpression(e)) {
        const m = consoleMember(checker.getSymbolAtLocation(e.name));
        if (m) return m;
        const n = e.name.text;
        if (n === "call" || n === "apply" || n === "bind") return methodOf(e.expression, depth + 1);
        return null;
      }
      if (ts.isElementAccessExpression(e)) {
        const a = e.argumentExpression;
        if (a && (ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a))) {
          const t = checker.getTypeAtLocation(e.expression);
          const m = consoleMember(t && t.getProperty(a.text));
          if (m) return m;
        }
        return consoleMember(checker.getSymbolAtLocation(e));
      }
      if (ts.isCallExpression(e)) {
        // e.g. console.log.bind(console)(...)
        const c = strip(e.expression);
        if (ts.isPropertyAccessExpression(c) && c.name.text === "bind") return methodOf(c.expression, depth + 1);
        return null;
      }
      if (ts.isIdentifier(e)) {
        const sym = checker.getSymbolAtLocation(e);
        const direct = consoleMember(sym);
        if (direct) return direct;
        const d = sym && (sym.declarations || [])[0];
        if (!d) return null;
        if (ts.isVariableDeclaration(d) && d.initializer && ts.isIdentifier(d.name)) {
          return methodOf(d.initializer, depth + 1);
        }
        if (ts.isBindingElement(d)) {
          const pat = d.parent;
          const decl = pat && pat.parent;
          const name = d.propertyName || d.name;
          if (ts.isObjectBindingPattern(pat) && decl && decl.initializer && ts.isIdentifier(name)) {
            const t = checker.getTypeAtLocation(decl.initializer);
            return consoleMember(t && t.getProperty(name.text));
          }
        }
        return null;
      }
      return null;
    };
    const visit = (n) => {
      if (n.kind === ts.SyntaxKind.DebuggerStatement) {
        bad += 1;
        const p = where(n);
        ev.push({ line: p.line + 1, column: p.character + 1, node_kind: "DebuggerStatement", text: "debugger" });
      } else if (ts.isCallExpression(n)) {
        const m = methodOf(n.expression, 0);
        if (m) {
          const viol = !OK.has(m);
          if (viol) bad += 1;
          const p = where(n);
          ev.push({ line: p.line + 1, column: p.character + 1,
            node_kind: "CallExpression:Console." + m + (viol ? ":violates" : ":conforms"),
            text: n.getText(sourceFile).split("\n")[0] });
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sourceFile);
    if (ev.length === 0) return { outcome: "NOT_APPLICABLE", evidence: [] };
    return { outcome: bad ? "VIOLATED" : "SATISFIED", evidence: ev };
  },
};
