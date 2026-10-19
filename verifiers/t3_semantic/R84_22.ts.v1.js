// R84_22 (T3): "Use Zod for form validation."
// Governed construct: a form-validation site, i.e. code that validates user-submitted form data:
//   (a) a form-library validation option (`resolver`, `validationSchema`, `validate`, register rules);
//   (b) a validation call applied to form-derived data (schema.parse/safeParse/validate, adapter calls);
//   (c) a hand-rolled check (if/ternary/comparison/regex test/negation) over form-derived data;
//   (d) the browser constraint-validation API (checkValidity, reportValidity, setCustomValidity, .validity);
//   (e) express-validator chains (request-body validation by construction).
// Form-derived data: FormData values (by type), `.elements` of a form, `.value`/`.checked`/`.files` of
// input/textarea/select elements (by type, or of an event target), a request `.body`, and every
// variable initialised/assigned from those (taint propagation stops at validation calls).
// A site conforms only when it is performed by Zod: the validating expression is BOUND (checker
// symbol resolution, through local variables and local adapter functions) to an import from "zod"
// (or "@hookform/resolvers/zod"). Names do not matter: a local object `z` or yup imported as `z` is
// not Zod. Zod used only on non-form data creates no instance.
module.exports = {
  tier: "T3",
  verify(ctx) {
    const { ts, sourceFile, checker, program } = ctx;
    const ev = [];
    let bad = 0;
    const where = (n) => sourceFile.getLineAndCharacterOfPosition(n.getStart(sourceFile));
    const add = (n, kind, ok) => {
      if (!ok) bad += 1;
      const p = where(n);
      ev.push({ line: p.line + 1, column: p.character + 1, node_kind: kind,
                text: n.getText(sourceFile).split("\n")[0].slice(0, 160) });
    };
    const isLibSym = (sym) => !!sym && (sym.declarations || []).some(
      (d) => program.isSourceFileDefaultLibrary(d.getSourceFile()));
    const strip = (e) => {
      while (e && (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isNonNullExpression(e) ||
             ts.isTypeAssertionExpression(e) || ts.isSatisfiesExpression(e) || ts.isAwaitExpression(e))) e = e.expression;
      return e;
    };
    const rootId = (e) => {
      e = strip(e);
      for (;;) {
        if (ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e) || ts.isCallExpression(e) ||
            ts.isNewExpression(e)) e = strip(e.expression);
        else break;
      }
      return e && ts.isIdentifier(e) ? e : undefined;
    };
    const symOf = (id) => {
      if (id.parent && ts.isShorthandPropertyAssignment(id.parent) && id.parent.name === id) {
        return checker.getShorthandAssignmentValueSymbol(id.parent);
      }
      return checker.getSymbolAtLocation(id);
    };
    const moduleOfDecl = (d) => {
      let p = d;
      while (p && !ts.isImportDeclaration(p) && !ts.isImportEqualsDeclaration(p) && !ts.isSourceFile(p)) p = p.parent;
      if (!p || ts.isSourceFile(p)) return undefined;
      if (ts.isImportDeclaration(p)) return ts.isStringLiteral(p.moduleSpecifier) ? p.moduleSpecifier.text : undefined;
      const r = p.moduleReference;
      if (r && ts.isExternalModuleReference(r) && ts.isStringLiteral(r.expression)) return r.expression.text;
      return undefined;
    };
    const isZodModule = (m) => m === "zod" || m.indexOf("zod/") === 0 || m === "@hookform/resolvers/zod";
    const isFnLike = (n) => ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isArrowFunction(n) ||
      ts.isMethodDeclaration(n);

    // ---- Zod binding resolution ----
    let zodSymRooted; // forward
    const containsZodRef = (node, depth, seen) => {
      let found = false;
      const walk = (n) => {
        if (found || ts.isTypeNode(n)) return;
        if (ts.isIdentifier(n)) {
          const par = n.parent;
          const isPropName = par && ts.isPropertyAccessExpression(par) && par.name === n;
          const isDeclName = par && (ts.isVariableDeclaration(par) || ts.isParameter(par) || ts.isPropertyAssignment(par) ||
            ts.isBindingElement(par) || ts.isFunctionDeclaration(par)) && par.name === n;
          if (!isPropName && !isDeclName && zodSymRooted(symOf(n), depth + 1, seen)) found = true;
          return;
        }
        ts.forEachChild(n, walk);
      };
      walk(node);
      return found;
    };
    zodSymRooted = (sym, depth, seen) => {
      if (!sym || depth > 8 || seen.has(sym)) return false;
      seen.add(sym);
      for (const d of sym.declarations || []) {
        const m = moduleOfDecl(d);
        if (m !== undefined) { if (isZodModule(m)) return true; continue; }
        if (ts.isVariableDeclaration(d) && d.initializer) {
          const init = strip(d.initializer);
          if (isFnLike(init)) { if (init.body && containsZodRef(init.body, depth, seen)) return true; continue; }
          const r = rootId(init);
          if (r && zodSymRooted(symOf(r), depth + 1, seen)) return true;
        } else if (isFnLike(d) && d.body) {
          if (containsZodRef(d.body, depth, seen)) return true;
        }
      }
      return false;
    };
    const zodRooted = (e) => {
      const r = rootId(e);
      if (r) return zodSymRooted(symOf(r), 0, new Set());
      const s = strip(e);
      if (s && isFnLike(s) && s.body) return containsZodRef(s.body, 0, new Set());
      return false;
    };
    const exprHasZod = (e) => zodRooted(e) || containsZodRef(e, 0, new Set());

    // ---- form-data sources ----
    const typeName = (n) => {
      const t = checker.getTypeAtLocation(n);
      if (!t) return "";
      if (t.flags & ts.TypeFlags.Any) return "any";
      const s = t.getSymbol() || t.aliasSymbol;
      return s ? s.getName() : "";
    };
    const FIELD_PROPS = new Set(["value", "valueAsNumber", "valueAsDate", "checked", "files", "selectedOptions"]);
    const FIELD_TYPES = new Set(["HTMLInputElement", "HTMLTextAreaElement", "HTMLSelectElement"]);
    const isSource = (n) => {
      if (ts.isNewExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === "FormData") return true;
      if (ts.isIdentifier(n) || ts.isCallExpression(n) || ts.isAwaitExpression(n)) {
        const par = n.parent;
        if (ts.isIdentifier(n) && par && ts.isPropertyAccessExpression(par) && par.name === n) return false;
        if (typeName(n) === "FormData") return true;
      }
      if (ts.isPropertyAccessExpression(n)) {
        const name = n.name.text;
        const recv = strip(n.expression);
        const rt = recv.getText(sourceFile).replace(/\s+/g, "");
        if (name === "elements") {
          const tn = typeName(recv);
          return tn === "HTMLFormElement" || tn === "any";
        }
        if (FIELD_PROPS.has(name)) {
          if (FIELD_TYPES.has(typeName(recv))) return true;
          if (/^(e|ev|evt|event)\.(target|currentTarget)$/.test(rt)) return true;
        }
        if (name === "body" && /^(req|request|ctx\.request|c\.req)$/.test(rt)) return true;
      }
      return false;
    };

    // ---- taint and validation calls ----
    const tainted = new Set();
    const VALIDATE_METHODS = new Set(["parse", "safeParse", "parseAsync", "safeParseAsync", "spa", "validate",
      "validateSync", "validateAsync", "validateAt", "validateSyncAt", "isValid", "isValidSync", "assert", "check",
      "decode"]);
    const FOREIGN = /^(yup|joi|@hapi\/joi|validator(\/.*)?|superstruct|valibot|class-validator|ajv|vest|io-ts|runtypes|@sinclair\/typebox|arktype|@vinejs\/vine|express-validator|@hookform\/resolvers\/.+)$/;
    const foreignRooted = (e) => {
      const r = rootId(e);
      const sym = r && symOf(r);
      return !!sym && (sym.declarations || []).some((d) => { const m = moduleOfDecl(d); return m !== undefined && FOREIGN.test(m); });
    };
    let refsTaint; // forward
    const valCache = new Map();
    const validationKind = (call) => {
      // returns undefined (not a validation call), "zod" or "other"
      if (!call.arguments.some((a) => refsTaint(a))) return undefined;
      const callee = strip(call.expression);
      if (zodRooted(callee) || call.arguments.some((a) => !refsTaint(a) && exprHasZod(a))) return "zod";
      const r = rootId(callee);
      if (r && isLibSym(symOf(r))) return undefined;
      if (foreignRooted(callee)) return "other";
      if (ts.isPropertyAccessExpression(callee) && VALIDATE_METHODS.has(callee.name.text)) return "other";
      return undefined;
    };
    const isValidationCall = (n) => ts.isCallExpression(n) && validationKind(n) !== undefined;
    refsTaint = (node) => {
      let found = false;
      const walk = (n) => {
        if (found) return;
        if (ts.isTypeNode(n)) return;
        if (n !== node && ts.isCallExpression(n) && isValidationCall(n)) return;
        if (isSource(n)) { found = true; return; }
        if (ts.isIdentifier(n)) {
          const s = symOf(n);
          if (s && tainted.has(s)) found = true;
          return;
        }
        ts.forEachChild(n, walk);
      };
      walk(node);
      return found;
    };
    const markName = (name) => {
      let changed = false;
      const m = (b) => {
        if (ts.isIdentifier(b)) {
          const s = checker.getSymbolAtLocation(b);
          if (s && !tainted.has(s)) { tainted.add(s); changed = true; }
        } else if (ts.isObjectBindingPattern(b) || ts.isArrayBindingPattern(b)) {
          for (const el of b.elements) if (ts.isBindingElement(el)) m(el.name);
        }
      };
      m(name);
      return changed;
    };
    for (let iter = 0; iter < 10; iter++) {
      let changed = false;
      const prop = (n) => {
        if (ts.isVariableDeclaration(n) && n.initializer) {
          const init = strip(n.initializer);
          if (!(ts.isCallExpression(init) && isValidationCall(init)) && refsTaint(n.initializer)) {
            if (markName(n.name)) changed = true;
          }
        } else if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
                   ts.isIdentifier(n.left)) {
          const rhs = strip(n.right);
          if (!(ts.isCallExpression(rhs) && isValidationCall(rhs)) && refsTaint(n.right)) {
            if (markName(n.left)) changed = true;
          }
        }
        ts.forEachChild(n, prop);
      };
      prop(sourceFile);
      if (!changed) break;
    }

    // ---- instance collection ----
    const OPTION_CALLS = /^(useForm|useFormik|useField|register|useController|withFormik|createForm|useFormState)$/;
    const calleeName = (c) => {
      const e = strip(c.expression);
      if (ts.isIdentifier(e)) return e.text;
      if (ts.isPropertyAccessExpression(e)) return e.name.text;
      return "";
    };
    const RULE_KEYS = new Set(["required", "pattern", "minLength", "maxLength", "min", "max"]);
    const COMPARE = new Set([ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken,
      ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken, ts.SyntaxKind.LessThanToken,
      ts.SyntaxKind.GreaterThanToken, ts.SyntaxKind.LessThanEqualsToken, ts.SyntaxKind.GreaterThanEqualsToken]);
    const isCheckNode = (n) => {
      const p = n.parent;
      if (p && (ts.isIfStatement(p) || ts.isWhileStatement(p) || ts.isDoStatement(p)) && p.expression === n) return true;
      if (p && ts.isConditionalExpression(p) && p.condition === n) return true;
      if (ts.isBinaryExpression(n) && COMPARE.has(n.operatorToken.kind)) return true;
      if (ts.isPrefixUnaryExpression(n) && n.operator === ts.SyntaxKind.ExclamationToken) return true;
      if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) &&
          /^(test|match|matchAll)$/.test(n.expression.name.text)) return true;
      if (ts.isBinaryExpression(n) && p && ts.isExpressionStatement(p) &&
          (n.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
           n.operatorToken.kind === ts.SyntaxKind.BarBarToken)) return true;
      return false;
    };
    const visit = (n, inCheck) => {
      // (a) form-library validation options
      if ((ts.isPropertyAssignment(n) || ts.isJsxAttribute(n)) && n.name && ts.isIdentifier(n.name)) {
        const key = n.name.text;
        const init = ts.isPropertyAssignment(n) ? n.initializer
          : (n.initializer && ts.isJsxExpression(n.initializer) ? n.initializer.expression : n.initializer);
        let optCall = false;
        if (ts.isPropertyAssignment(n) && ts.isObjectLiteralExpression(n.parent) && n.parent.parent &&
            ts.isCallExpression(n.parent.parent)) optCall = OPTION_CALLS.test(calleeName(n.parent.parent));
        const isSite = key === "resolver" || key === "validationSchema" ||
          (key === "validate" && (ts.isJsxAttribute(n) || optCall));
        if (isSite && init) {
          add(n, (ts.isJsxAttribute(n) ? "JsxAttribute:" : "PropertyAssignment:") + key, exprHasZod(init));
        } else if (ts.isPropertyAssignment(n) && RULE_KEYS.has(key) && optCall &&
                   calleeName(n.parent.parent) === "register") {
          add(n, "PropertyAssignment:register-rule", false);
        }
      }
      if (ts.isCallExpression(n)) {
        const k = validationKind(n);
        const cn = calleeName(n);
        if (k) add(n, k === "zod" ? "CallExpression:zod-validation" : "CallExpression:non-zod-validation", k === "zod");
        else if (/^(checkValidity|reportValidity|setCustomValidity)$/.test(cn) &&
                 ts.isPropertyAccessExpression(strip(n.expression))) add(n, "CallExpression:constraint-validation-api", false);
        else if (foreignRooted(n.expression) && (() => {
          const r = rootId(n.expression); const s = r && symOf(r);
          return !!s && (s.declarations || []).some((d) => moduleOfDecl(d) === "express-validator");
        })() && !(n.parent && ts.isPropertyAccessExpression(n.parent) && n.parent.parent && ts.isCallExpression(n.parent.parent))) {
          add(n, "CallExpression:express-validator", false);
        }
      }
      if (ts.isPropertyAccessExpression(n) && n.name.text === "validity") {
        const tn = typeName(n.expression);
        if (FIELD_TYPES.has(tn) || tn === "HTMLFormElement" || tn === "any" || /Element$/.test(tn)) {
          add(n, "PropertyAccessExpression:constraint-validation-api", false);
        }
      }
      // (c) hand-rolled checks over form-derived data
      let nowInCheck = inCheck;
      if (!inCheck && isCheckNode(n) && !(ts.isCallExpression(n) && isValidationCall(n)) && refsTaint(n)) {
        add(n, "HandRolledCheck:" + ts.SyntaxKind[n.kind], false);
        nowInCheck = true;
      }
      ts.forEachChild(n, (c) => visit(c, nowInCheck));
    };
    visit(sourceFile, false);
    if (ev.length === 0) return { outcome: "NOT_APPLICABLE", evidence: [] };
    return { outcome: bad ? "VIOLATED" : "SATISFIED", evidence: ev };
  },
};
