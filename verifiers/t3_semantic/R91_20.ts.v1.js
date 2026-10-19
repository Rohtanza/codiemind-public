// R91_20 (T3): "Authentication must be implemented using Amazon Cognito."
// Governed construct: an authentication operation (sign in / sign up, credential or token
// verification, registration of an auth strategy/provider). Each call or construction is
// judged by the module its callee is actually BOUND to, resolved with the type checker:
//   - import / require bindings (incl. aliases: the ORIGINAL exported name decides);
//   - locals derived from a module value (`const user = new CognitoUser(..)`,
//     `const verifier = CognitoJwtVerifier.create(..)`, `const sb = createClient(..)`);
//   - local functions with an auth-like name (they shadow imports): conforming only if
//     their body itself performs a module-bound auth operation (a wrapper); otherwise it is
//     a hand-rolled authentication (e.g. POSTing credentials to a custom endpoint) = VIOLATED.
// Cognito modules conform; any other auth module violates. Unknown/relative modules and
// parameters cannot be resolved in a single-file program and are not counted.
module.exports = {
  tier: "T3",
  verify(ctx) {
    const { ts, sourceFile, checker } = ctx;

    const COGNITO = /^(aws-amplify|aws-amplify\/auth(\/.*)?|@aws-amplify\/auth(\/.*)?|amazon-cognito-identity-js|@aws-sdk\/client-cognito-identity-provider|@aws-sdk\/client-cognito-identity|aws-jwt-verify(\/.*)?|@aws-amplify\/ui-(react|react-native|vue|angular)(\/.*)?)$/;
    const COGNITO_OP = /^(sign(In|Up)(With\w*)?|confirmSign(In|Up)|autoSignIn|authenticateUser|completeNewPasswordChallenge|sendMFACode|\w*InitiateAuth(Command)?|\w*RespondToAuthChallenge(Command)?|(Admin)?SignUp(Command)?|(Admin)?ConfirmSignUp(Command)?|verify\w*|withAuthenticator)$/;
    const OTHER = /^(firebase(\/.*)?|@firebase\/auth(\/.*)?|firebase-admin(\/.*)?|passport(-.*)?|@nestjs\/passport|@nestjs\/jwt|next-auth(\/.*)?|@auth\/.+|@next-auth\/.+|auth0(\/.*)?|@auth0\/.+|express-openid-connect|jsonwebtoken|jose|bcrypt|bcryptjs|argon2|@node-rs\/(argon2|bcrypt)|@supabase\/.+|@clerk\/.+|lucia(\/.*)?|@lucia-auth\/.+|better-auth(\/.*)?|@okta\/.+|keycloak-js|keycloak-connect|oidc-client(-ts)?|openid-client|@azure\/msal-.+|express-jwt|google-auth-library|@react-oauth\/google|stytch|@stytch\/.+|magic-sdk|@magic-sdk\/.+|appwrite|@descope\/.+|@kinde-oss\/.+|@workos-inc\/.+|jwks-rsa)$/;
    const OTHER_OP = /^(sign(In|Up)\w*|createUserWith\w*|confirmSign(In|Up)\w*|log[iI]n(With\w*)?|authenticate\w*|authorize\w*|verify\w*|jwtVerify|getServerSession|getToken|handleAuth|handleLogin|requiresAuth|createAuth0Client|acquireToken\w*|exchangeCodeForSession|NextAuth|\w*Strategy|\w*Provider|Credentials|SignJWT|expressjwt)$/;
    // generic member names that are auth operations only on specific modules
    const GENERIC = [
      [/^(use|authenticate)$/, /^(passport(-.*)?|@nestjs\/passport)$/],
      [/^(sign|verify|compare|compareSync|hash|hashSync)$/, /^(jsonwebtoken|jose|bcrypt|bcryptjs|argon2|@node-rs\/(argon2|bcrypt)|@nestjs\/jwt)$/],
      [/^auth$/, /^(express-openid-connect|auth0(\/.*)?|@auth0\/.+)$/],
    ];
    // auth-like names for locally declared functions
    const LOCAL_OP = /^(sign(In|Up)(With\w*)?|log[iI]n(With\w*)?|authenticate(User)?|confirmSign(In|Up)|verify(Token|Jwt|JWT|IdToken|AccessToken|Credentials|Password|User))$/;

    const where = (n) => sourceFile.getLineAndCharacterOfPosition(n.getStart(sourceFile));
    const strip = (e) => {
      while (e && (ts.isParenthesizedExpression(e) || ts.isAwaitExpression(e) ||
        ts.isAsExpression(e) || ts.isNonNullExpression(e) || ts.isTypeAssertionExpression(e) ||
        (ts.isSatisfiesExpression && ts.isSatisfiesExpression(e)))) e = e.expression;
      return e;
    };
    const rootOf = (e) => {
      e = strip(e);
      while (e && (ts.isPropertyAccessExpression(e) || ts.isCallExpression(e) ||
        ts.isNewExpression(e) || ts.isElementAccessExpression(e))) e = strip(e.expression);
      return e && ts.isIdentifier(e) ? e : undefined;
    };
    const isRequire = (e) => {
      e = strip(e);
      return !!e && ts.isCallExpression(e) && ts.isIdentifier(e.expression) &&
        e.expression.text === "require" && e.arguments.length === 1 &&
        ts.isStringLiteralLike(e.arguments[0]);
    };
    const firstName = (e) => {
      // `require("m").X.Y` -> "X"
      let cur = strip(e), name = "*";
      while (cur && ts.isPropertyAccessExpression(cur)) { name = cur.name.text; cur = strip(cur.expression); }
      return name;
    };
    const requireOf = (e) => {
      let cur = strip(e);
      while (cur && ts.isPropertyAccessExpression(cur)) cur = strip(cur.expression);
      return isRequire(cur) ? cur.arguments[0].text : undefined;
    };

    // binding(id) -> { kind: "module", module, name, direct } | { kind: "local", decl } | undefined
    const binding = (id, depth) => {
      if (!id || depth > 10) return undefined;
      const sym = checker.getSymbolAtLocation(id);
      const d = sym && (sym.declarations || [])[0];
      if (!d) return undefined;
      if (ts.isImportSpecifier(d) || ts.isImportClause(d) || ts.isNamespaceImport(d)) {
        let p = d;
        while (p && !ts.isImportDeclaration(p)) p = p.parent;
        if (!p || !ts.isStringLiteralLike(p.moduleSpecifier)) return undefined;
        const name = ts.isImportSpecifier(d) ? (d.propertyName || d.name).text
          : ts.isImportClause(d) ? "default" : "*";
        return { kind: "module", module: p.moduleSpecifier.text, name, direct: true };
      }
      if (ts.isImportEqualsDeclaration(d)) {
        const r = d.moduleReference;
        if (ts.isExternalModuleReference(r) && ts.isStringLiteralLike(r.expression))
          return { kind: "module", module: r.expression.text, name: "*", direct: true };
        return undefined;
      }
      if (ts.isBindingElement(d)) {
        const prop = d.propertyName || d.name;
        const propName = ts.isIdentifier(prop) || ts.isStringLiteralLike(prop) ? prop.text : undefined;
        let vd = d.parent && d.parent.parent;
        if (!vd || !ts.isVariableDeclaration(vd) || !vd.initializer) return undefined;
        const req = requireOf(vd.initializer);
        if (req) return { kind: "module", module: req, name: propName || "*", direct: true };
        const b = binding(rootOf(vd.initializer), depth + 1);
        if (b && b.kind === "module") return { kind: "module", module: b.module, name: b.name, prop: propName, direct: false };
        return b && b.kind === "local" ? { kind: "local", decl: d } : undefined;
      }
      if (ts.isVariableDeclaration(d)) {
        const init = d.initializer;
        if (!init) return { kind: "local", decl: d };
        const req = requireOf(init);
        if (req) return { kind: "module", module: req, name: firstName(init), direct: true };
        const s = strip(init);
        if (ts.isArrowFunction(s) || ts.isFunctionExpression(s)) return { kind: "local", decl: d, fn: s };
        const r = rootOf(s);
        const b = binding(r, depth + 1);
        if (b && b.kind === "module") {
          const prop = ts.isPropertyAccessExpression(s) ? s.name.text : undefined;
          return { kind: "module", module: b.module, name: b.name, prop, direct: false };
        }
        return { kind: "local", decl: d };
      }
      if (ts.isFunctionDeclaration(d)) return { kind: "local", decl: d, fn: d };
      return undefined; // parameters, classes, globals: not resolvable to an auth mechanism
    };

    const otherOp = (mod, op) => OTHER_OP.test(op) ||
      GENERIC.some(([o, m]) => o.test(op) && m.test(mod));

    // classify(node) -> { conform: bool } | undefined (not an auth instance)
    const classify = (n, seen) => {
      const callee = strip(n.expression);
      if (!callee) return undefined;
      let op, rootId, isIdentCallee = false;
      if (ts.isIdentifier(callee)) { rootId = callee; isIdentCallee = true; }
      else if (ts.isPropertyAccessExpression(callee)) { op = callee.name.text; rootId = rootOf(callee); }
      else return undefined;
      const b = binding(rootId, 0);
      if (!b) return undefined;
      if (b.kind === "module") {
        const mod = b.module;
        if (isIdentCallee) op = b.direct ? b.name : (b.prop || callee.text);
        const defaultCall = isIdentCallee && b.direct && (b.name === "default" || b.name === "*");
        if (defaultCall) op = callee.text;
        if (COGNITO.test(mod)) {
          if (/^aws-jwt-verify/.test(mod)) {
            if (!/^verify\w*$/.test(op)) return undefined;
            return { conform: b.name === "CognitoJwtVerifier" };
          }
          return COGNITO_OP.test(op) ? { conform: true } : undefined;
        }
        if (OTHER.test(mod)) {
          if (defaultCall && /^(next-auth|@auth\/|@next-auth\/|passport-|express-openid-connect|express-jwt)/.test(mod))
            return { conform: false };
          return otherOp(mod, op) ? { conform: false } : undefined;
        }
        return undefined;
      }
      // locally declared callee
      if (!isIdentCallee || !LOCAL_OP.test(callee.text) || !b.fn) return undefined;
      if (seen.has(b.fn)) return undefined;
      seen.add(b.fn);
      let wraps = false;
      const scan = (m) => {
        if (wraps) return;
        if ((ts.isCallExpression(m) || ts.isNewExpression(m)) && classify(m, seen)) { wraps = true; return; }
        ts.forEachChild(m, scan);
      };
      if (b.fn.body) scan(b.fn.body);
      return wraps ? undefined : { conform: false, local: true };
    };

    const ev = [];
    let bad = 0;
    const visit = (n) => {
      if (ts.isCallExpression(n) || ts.isNewExpression(n)) {
        const c = classify(n, new Set());
        if (c) {
          if (!c.conform) bad += 1;
          const p = where(n);
          const kind = (ts.isCallExpression(n) ? "CallExpression" : "NewExpression") +
            (c.conform ? ":cognito-auth" : c.local ? ":local-non-cognito-auth" : ":non-cognito-auth");
          ev.push({ line: p.line + 1, column: p.character + 1, node_kind: kind,
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
