// R39_44 (T3): "Use react-native-svg-charts for time distribution."
// Governed construct: a JSX element whose tag binds (through the checker's symbol for the tag's
// root identifier) to a value import of a charting library. Conforms iff that module is
// react-native-svg-charts (or a subpath). Binding is followed through ES imports (named, aliased,
// default, namespace), TS import-equals, CommonJS require (direct, destructured, member), and
// local const aliases. Type-only imports never bind a rendered value and are not instances.
// The 'time distribution' qualifier is held constant (not judged), per the fixture manifest.
module.exports = {
  tier: "T3",
  verify(ctx) {
    const { ts, sourceFile, checker } = ctx;
    const ev = [];
    let bad = 0;
    const where = (n) => sourceFile.getLineAndCharacterOfPosition(n.getStart(sourceFile));

    const GOOD = /^react-native-svg-charts(\/|$)/;
    const CHART = [
      /^react-native-svg-charts(\/|$)/,
      /^react-native-chart-kit(\/|$)/,
      /^victory(-[a-z-]+)?(\/|$)/,
      /^recharts(\/|$)/,
      /^react-native-gifted-charts(\/|$)/,
      /^react-native-charts-wrapper(\/|$)/,
      /^react-native-responsive-linechart(\/|$)/,
      /^react-native-pie-chart(\/|$)/,
      /^react-native-wagmi-charts(\/|$)/,
      /^@rainbow-me\/animated-charts(\/|$)/,
      /^react-native-echarts(-[a-z-]+)?(\/|$)/,
      /^@wuba\/react-native-echarts(\/|$)/,
      /^echarts-for-react(\/|$)/,
      /^react-chartjs-2(\/|$)/,
      /^chart\.js(\/|$)/,
      /^@nivo\//,
      /^@visx\//,
      /^react-vis(\/|$)/,
      /^react-apexcharts(\/|$)/,
      /^highcharts-react-official(\/|$)/,
      /^@highcharts\//,
      /^react-plotly\.js(\/|$)/,
      /^@mui\/x-charts(\/|$)/,
      /^@tremor\//,
      /^react-google-charts(\/|$)/,
      /^@ant-design\/(charts|plots)(\/|$)/,
      /^react-native-svg-pie-chart(\/|$)/,
      /^react-native-chart(\/|$)/,
    ];
    const isChart = (m) => CHART.some((r) => r.test(m));

    const requireModule = (e) => {
      // require('m'), require('m').X, require('m').default.X ...
      while (e && (ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e) ||
                   ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isNonNullExpression(e))) {
        e = e.expression;
      }
      if (e && ts.isCallExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === "require" &&
          e.arguments.length === 1 && ts.isStringLiteralLike(e.arguments[0])) {
        return e.arguments[0].text;
      }
      return undefined;
    };
    const rootIdent = (e) => {
      while (e && (ts.isPropertyAccessExpression(e) || ts.isParenthesizedExpression(e) ||
                   ts.isAsExpression(e) || ts.isNonNullExpression(e) || ts.isElementAccessExpression(e))) {
        e = e.expression;
      }
      return e && ts.isIdentifier(e) ? e : undefined;
    };

    // Resolve an identifier to the module it is (value-)bound to, or undefined.
    const moduleOf = (id, depth) => {
      if (!id || depth > 10) return undefined;
      const sym = checker.getSymbolAtLocation(id);
      const d = sym && (sym.declarations || [])[0];
      if (!d) return undefined;
      if (ts.isImportSpecifier(d) || ts.isImportClause(d) || ts.isNamespaceImport(d)) {
        let p = d;
        while (p && !ts.isImportDeclaration(p)) p = p.parent;
        if (!p || !ts.isStringLiteral(p.moduleSpecifier)) return undefined;
        const clause = p.importClause;
        if (clause && clause.isTypeOnly) return undefined;
        if (ts.isImportSpecifier(d) && d.isTypeOnly) return undefined;
        return p.moduleSpecifier.text;
      }
      if (ts.isImportEqualsDeclaration(d)) {
        if (d.isTypeOnly) return undefined;
        const r = d.moduleReference;
        if (ts.isExternalModuleReference(r) && ts.isStringLiteralLike(r.expression)) return r.expression.text;
        if (ts.isEntityName(r)) {
          let q = r;
          while (ts.isQualifiedName(q)) q = q.left;
          return moduleOf(q, depth + 1);
        }
        return undefined;
      }
      if (ts.isBindingElement(d)) {
        let p = d;
        while (p && !ts.isVariableDeclaration(p)) p = p.parent;
        if (!p || !p.initializer) return undefined;
        const m = requireModule(p.initializer);
        if (m !== undefined) return m;
        return moduleOf(rootIdent(p.initializer), depth + 1);
      }
      if (ts.isVariableDeclaration(d) && d.initializer) {
        const m = requireModule(d.initializer);
        if (m !== undefined) return m;
        return moduleOf(rootIdent(d.initializer), depth + 1);
      }
      return undefined;
    };

    const visit = (n) => {
      if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) {
        const tag = n.tagName;
        const id = ts.isIdentifier(tag) ? tag : rootIdent(tag);
        if (id && !(ts.isIdentifier(tag) && /^[a-z]/.test(tag.text) && !tag.text.includes("."))) {
          const m = moduleOf(id, 0);
          if (m !== undefined && isChart(m)) {
            const ok = GOOD.test(m);
            if (!ok) bad += 1;
            const p = where(n);
            ev.push({
              line: p.line + 1, column: p.character + 1,
              node_kind: (ts.isJsxOpeningElement(n) ? "JsxOpeningElement" : "JsxSelfClosingElement") +
                (ok ? ":react-native-svg-charts" : ":other-chart-lib(" + m + ")"),
              text: n.getText(sourceFile).split("\n")[0],
            });
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
