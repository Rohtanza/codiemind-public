// R91_5 (T2): "All API Gateway endpoints must use Lambda Proxy Integration."
// Governed construct: each integration attached to an API Gateway endpoint in AWS CDK code:
//   - `new X(...)` of an API Gateway integration class (LambdaIntegration, AwsIntegration,
//     MockIntegration, HttpIntegration, Integration, SagemakerIntegration, StepFunctions*,
//     apigatewayv2 Http*Integration / WebSocket*Integration, CfnIntegration),
//   - `XStepFunctionsIntegration.startExecution(...)` static factory calls,
//   - each `new LambdaRestApi(...)` (its implicit default integration),
//   - each L1 `new CfnMethod(...)` whose props carry `integration: { ... }`.
// Conforming: LambdaIntegration without `proxy: false`; LambdaRestApi without
// `integrationOptions: { proxy: false }`; HttpLambdaIntegration / WebSocketLambdaIntegration;
// Integration / CfnMethod / CfnIntegration / v2 HttpIntegration whose type is AWS_PROXY
// (or v2 LAMBDA_PROXY). Everything else is non-conforming.
// Works on the syntax tree, so comments and string literals are never instances.
module.exports = {
  tier: "T2",
  verify(ctx) {
    const { ts, sourceFile } = ctx;
    const ev = [];
    let bad = 0;

    const calleeName = (e) => {
      if (!e) return null;
      if (ts.isIdentifier(e)) return e.text;
      if (ts.isPropertyAccessExpression(e)) return e.name.text;
      if (ts.isParenthesizedExpression(e)) return calleeName(e.expression);
      return null;
    };
    const unwrap = (e) => {
      while (e && (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) ||
                   ts.isNonNullExpression(e) ||
                   (ts.isSatisfiesExpression && ts.isSatisfiesExpression(e)) ||
                   ts.isTypeAssertionExpression(e))) e = e.expression;
      return e;
    };
    const propName = (p) => {
      const n = p.name;
      if (!n) return null;
      if (ts.isIdentifier(n) || ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) return n.text;
      return null;
    };
    // Returns the initializer of property `key` in object literal `obj` (undefined if absent).
    const getProp = (obj, key) => {
      obj = unwrap(obj);
      if (!obj || !ts.isObjectLiteralExpression(obj)) return undefined;
      let found;
      for (const p of obj.properties) {
        if (propName(p) !== key) continue;
        if (ts.isPropertyAssignment(p)) found = p.initializer;
        else if (ts.isShorthandPropertyAssignment(p)) found = p.name;
      }
      return found;
    };
    const isFalse = (e) => {
      e = unwrap(e);
      return !!e && e.kind === ts.SyntaxKind.FalseKeyword;
    };
    // Literal type value: 'AWS_PROXY' string, or the last member of an enum access.
    const typeValue = (e) => {
      e = unwrap(e);
      if (!e) return null;
      if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return e.text.toUpperCase();
      if (ts.isPropertyAccessExpression(e)) return e.name.text.toUpperCase();
      return null;
    };
    const isProxyType = (e) => {
      const v = typeValue(e);
      return v === "AWS_PROXY" || v === "LAMBDA_PROXY";
    };

    const record = (n, ok) => {
      const pos = sourceFile.getLineAndCharacterOfPosition(n.getStart(sourceFile));
      if (!ok) bad += 1;
      ev.push({ line: pos.line + 1, column: pos.character + 1,
                node_kind: ts.SyntaxKind[n.kind] + (ok ? ":conforming" : ":non_conforming"),
                text: n.getText(sourceFile).split("\n")[0] });
    };

    const ALWAYS_PROXY = new Set(["HttpLambdaIntegration", "WebSocketLambdaIntegration"]);
    const NEVER_PROXY = new Set(["AwsIntegration", "MockIntegration", "SagemakerIntegration",
                                 "StepFunctionsIntegration"]);

    const visit = (n) => {
      if (ts.isNewExpression(n)) {
        const name = calleeName(n.expression);
        const args = n.arguments ? Array.from(n.arguments) : [];
        if (name === "LambdaIntegration") {
          record(n, !isFalse(getProp(args[1], "proxy")));
        } else if (name === "LambdaRestApi") {
          const opts = getProp(args[2], "integrationOptions");
          record(n, !isFalse(getProp(opts, "proxy")));
        } else if (ALWAYS_PROXY.has(name)) {
          record(n, true);
        } else if (NEVER_PROXY.has(name)) {
          record(n, false);
        } else if (name === "Integration") {
          record(n, isProxyType(getProp(args[0], "type")));
        } else if (name === "HttpIntegration") {
          // v1: new HttpIntegration(url, props?) -> HTTP/HTTP_PROXY, never Lambda.
          // v2 L2: new HttpIntegration(scope, id, { integrationType, ... }).
          const t = getProp(args[2], "integrationType");
          record(n, t !== undefined && isProxyType(t));
        } else if (name === "CfnIntegration") {
          // apigatewayv2 L1 (integrationType) or legacy apigateway L1.
          const t = getProp(args[2], "integrationType");
          const t2 = getProp(args[2], "type");
          record(n, isProxyType(t !== undefined ? t : t2));
        } else if (name === "CfnMethod") {
          const integ = getProp(args[2], "integration");
          if (integ !== undefined) record(n, isProxyType(getProp(integ, "type")));
        } else if (name && /^(Http|WebSocket)\w+Integration$/.test(name)) {
          record(n, false);
        }
      } else if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)) {
        const owner = calleeName(n.expression.expression);
        if (owner === "StepFunctionsIntegration" && n.expression.name.text === "startExecution") {
          record(n, false);
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sourceFile);
    if (ev.length === 0) return { outcome: "NOT_APPLICABLE", evidence: [] };
    return { outcome: bad ? "VIOLATED" : "SATISFIED", evidence: ev };
  },
};
