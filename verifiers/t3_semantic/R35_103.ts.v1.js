// R35_103 (T3): Korean email templates must render dates as yyyy년 MM월 dd일 and amounts in KRW.
// Governed construct: a date or money value interpolated into a Korean-language email template
// (template literal, "+" string chain, or JSX children whose literal text contains Hangul, in a
// file that is about e-mail). Each interpolated date value and each money value is one instance.
// Binding matters: a call named `format` conforms only when it is bound to date-fns (aliases and
// namespaces included) with a Korean pattern; a local function named `format` is analysed by its
// body (parameters bound to the call's arguments), and util.format is not date rendering.
// Honorifics, business conventions and cultural context are not machine-checkable (not verified).
module.exports = {
  tier: "T3",
  verify(ctx) {
    const { ts, sourceFile, checker, program } = ctx;
    const HANGUL = /[가-힣ᄀ-ᇿ㄰-㆏]/;
    const EMAIL_CTX = /mail|subject|메일|newsletter|inbox|recipient|수신|발신/i;
    if (!EMAIL_CTX.test(ctx.text)) return { outcome: "NOT_APPLICABLE", evidence: [] };

    const MAXD = 8;
    const KO_DATEFNS = /yyyy년\s*MM월\s*dd일/;
    const KO_DAYJS = /YYYY년\s*MM월\s*DD일/;
    const DATE_METHODS = new Set(["toLocaleDateString", "toISOString", "toDateString", "toLocaleString",
      "toUTCString", "toString", "toJSON", "toGMTString", "toTimeString", "toLocaleTimeString", "valueOf", "getTime"]);
    const STR_METHODS = new Set(["slice", "substring", "substr", "trim", "trimStart", "trimEnd", "replace",
      "replaceAll", "padStart", "padEnd", "toUpperCase", "toLowerCase", "concat", "normalize", "toString"]);
    const DATEFNS_MODS = /^(date-fns|date-fns-tz|date-fns\/.*|@date-fns\/.*)$/;
    const DATEFNS_FUNCS = new Set(["format", "formatInTimeZone", "formatDate", "lightFormat"]);

    const isLibDecl = (d) => program.isSourceFileDefaultLibrary(d.getSourceFile());
    const isLib = (sym) => !!sym && (sym.declarations || []).some(isLibDecl);
    const strip = (e) => {
      while (e && (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isNonNullExpression(e) ||
        ts.isTypeAssertionExpression(e) || (ts.isSatisfiesExpression && ts.isSatisfiesExpression(e)))) e = e.expression;
      return e;
    };
    const symOf = (n) => { try { return checker.getSymbolAtLocation(n); } catch (_e) { return undefined; } };
    const declOf = (sym) => (sym && sym.declarations && sym.declarations[0]) || undefined;

    // Import binding of an identifier: { module, imported } or undefined.
    const importOf = (id) => {
      const d = declOf(symOf(id));
      if (!d) return undefined;
      if (ts.isImportSpecifier(d)) {
        const decl = d.parent.parent.parent;
        return { module: decl.moduleSpecifier.text, imported: (d.propertyName || d.name).text };
      }
      if (ts.isImportClause(d)) return { module: d.parent.moduleSpecifier.text, imported: "default" };
      if (ts.isNamespaceImport(d)) return { module: d.parent.parent.moduleSpecifier.text, imported: "*" };
      if (ts.isImportEqualsDeclaration(d) && ts.isExternalModuleReference(d.moduleReference) &&
        ts.isStringLiteral(d.moduleReference.expression)) return { module: d.moduleReference.expression.text, imported: "*" };
      // const { format } = require('date-fns')  /  const df = require('date-fns')
      const reqMod = (init) => {
        init = strip(init);
        if (init && ts.isCallExpression(init) && ts.isIdentifier(init.expression) && init.expression.text === "require" &&
          init.arguments.length && ts.isStringLiteral(init.arguments[0])) return init.arguments[0].text;
        return undefined;
      };
      if (ts.isBindingElement(d) && ts.isObjectBindingPattern(d.parent) && ts.isVariableDeclaration(d.parent.parent)) {
        const m = reqMod(d.parent.parent.initializer);
        if (m) return { module: m, imported: (d.propertyName || d.name).getText(sourceFile) };
      }
      if (ts.isVariableDeclaration(d) && d.initializer) {
        const m = reqMod(d.initializer);
        if (m) return { module: m, imported: "*" };
      }
      return undefined;
    };

    // Follow identifiers through parameter bindings (env) and variable initializers.
    const resolve = (e, env, depth) => {
      e = strip(e);
      for (let i = 0; e && ts.isIdentifier(e) && i < MAXD; i++) {
        const sym = symOf(e);
        if (sym && env && env.has(sym)) { const b = env.get(sym); e = strip(b.expr); env = b.env; continue; }
        const d = declOf(sym);
        if (d && ts.isVariableDeclaration(d) && ts.isIdentifier(d.name) && d.initializer &&
          d.getSourceFile() === sourceFile) { e = strip(d.initializer); env = undefined; continue; }
        break;
      }
      return { node: e, env };
    };
    const resolveString = (e, env) => {
      if (!e) return undefined;
      const r = resolve(e, env, 0);
      const n = r.node;
      if (n && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n))) return n.text;
      try {
        const t = checker.getTypeAtLocation(n);
        if (t && t.isStringLiteral && t.isStringLiteral()) return t.value;
      } catch (_e) { /* ignore */ }
      return undefined;
    };
    const resolveLocale = (e, env) => {
      if (!e) return undefined;
      const r = resolve(e, env, 0);
      if (r.node && ts.isArrayLiteralExpression(r.node)) return r.node.elements.length ? resolveString(r.node.elements[0], r.env) : undefined;
      return resolveString(e, env);
    };
    const optProp = (e, env, name) => {
      if (!e) return undefined;
      const r = resolve(e, env, 0);
      if (!r.node || !ts.isObjectLiteralExpression(r.node)) return undefined;
      let v;
      for (const p of r.node.properties) {
        const pn = p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) ? p.name.text : undefined;
        if (pn !== name) continue;
        if (ts.isPropertyAssignment(p)) v = resolveString(p.initializer, r.env);
        else if (ts.isShorthandPropertyAssignment(p)) v = resolveString(p.name, r.env);
      }
      return v;
    };
    const isKo = (loc) => typeof loc === "string" && /^ko(-|_|$)/i.test(loc);

    const typeOf = (e) => {
      try { return checker.getNonNullableType(checker.getTypeAtLocation(e)); } catch (_e) { return undefined; }
    };
    const isDateType = (e) => {
      const t = typeOf(e);
      if (!t) return false;
      const parts = t.isUnion && t.isUnion() ? t.types : [t];
      return parts.some((x) => { const s = x.getSymbol && x.getSymbol(); return !!s && s.getName() === "Date" && isLib(s); });
    };
    const isNumType = (e) => {
      const t = typeOf(e);
      return !!t && (t.flags & (ts.TypeFlags.NumberLike | ts.TypeFlags.BigIntLike)) !== 0 && !(t.flags & ts.TypeFlags.Any);
    };

    // number formatting description
    const numFmt = (locale, currency, style) => {
      if (currency || style === "currency") return { kind: "money", ok: currency === "KRW" && isKo(locale), why: "currency " + (currency || "?") + " locale " + (locale || "default") };
      return { kind: "num", ko: isKo(locale), why: "number locale " + (locale || "default") };
    };
    const isIntlCtor = (n, name) => {
      n = strip(n);
      if (!n || !(ts.isNewExpression(n) || ts.isCallExpression(n))) return false;
      const c = strip(n.expression);
      if (!ts.isPropertyAccessExpression(c) || c.name.text !== name) return false;
      const root = strip(c.expression);
      if (!ts.isIdentifier(root) || root.text !== "Intl") return false;
      const s = symOf(root);
      return !s || isLib(s);
    };

    const combine = (rs) => {
      rs = rs.filter(Boolean);
      if (!rs.length) return null;
      const inst = rs.filter((r) => r.kind === "date" || r.kind === "money");
      if (inst.length) {
        const bad = inst.find((r) => !r.ok);
        return bad ? { kind: bad.kind, ok: false, why: bad.why } : { kind: inst[0].kind, ok: true, why: inst[0].why };
      }
      return rs[0];
    };

    const functionLike = (sym) => {
      const d = declOf(sym);
      if (!d || d.getSourceFile() !== sourceFile) return undefined;
      if (ts.isFunctionDeclaration(d) || ts.isMethodDeclaration(d)) return d;
      if (ts.isVariableDeclaration(d) && d.initializer) {
        const i = strip(d.initializer);
        if (ts.isArrowFunction(i) || ts.isFunctionExpression(i)) return i;
      }
      return undefined;
    };
    const returnExprs = (fn) => {
      if (!fn.body) return [];
      if (!ts.isBlock(fn.body)) return [fn.body];
      const out = [];
      const walk = (n) => {
        if (ts.isFunctionLike(n) && n !== fn) return;
        if (ts.isReturnStatement(n) && n.expression) out.push(n.expression);
        ts.forEachChild(n, walk);
      };
      ts.forEachChild(fn.body, walk);
      return out;
    };

    // Classify the rendered value of an expression: {kind:"date"|"money"|"num", ok/ko, why} or null.
    const classify = (e0, env, depth) => {
      if (depth > MAXD) return null;
      const e = strip(e0);
      if (!e) return null;
      if (ts.isIdentifier(e)) {
        const r = resolve(e, env, depth);
        if (r.node !== e) return classify(r.node, r.env, depth + 1);
        return typeFallback(e);
      }
      if (ts.isTemplateExpression(e) || (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.PlusToken)) {
        const parts = flatten(e);
        if (parts.every((p) => p.text !== undefined)) return null;
        if (ts.isBinaryExpression(e) && !parts.some((p) => p.text !== undefined)) return typeFallback(e);
        return combine(analyzeParts(parts, env, depth + 1).map((x) => x.res));
      }
      if (ts.isConditionalExpression(e)) return combine([classify(e.whenTrue, env, depth + 1), classify(e.whenFalse, env, depth + 1)]);
      if (ts.isBinaryExpression(e) && (e.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
        e.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken)) return combine([classify(e.left, env, depth + 1), classify(e.right, env, depth + 1)]);
      if (ts.isCallExpression(e)) return classifyCall(e, env, depth);
      return typeFallback(e);
    };
    const typeFallback = (e) => {
      if (isDateType(e)) return { kind: "date", ok: false, why: "raw Date value" };
      if (isNumType(e)) return { kind: "num", ko: false, why: "unformatted number" };
      return null;
    };
    const classifyCall = (e, env, depth) => {
      const callee = strip(e.expression);
      const args = e.arguments;
      // date-fns (named, aliased, namespace, require)
      let fnName, imp;
      if (ts.isIdentifier(callee)) { imp = importOf(callee); fnName = imp && imp.imported; }
      else if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(strip(callee.expression))) {
        const nsImp = importOf(strip(callee.expression));
        if (nsImp && (nsImp.imported === "*" || nsImp.imported === "default") && DATEFNS_MODS.test(nsImp.module)) {
          imp = nsImp; fnName = callee.name.text;
        }
      }
      if (imp && DATEFNS_MODS.test(imp.module)) {
        if (DATEFNS_FUNCS.has(fnName) || (fnName === "default" && /\/format$/.test(imp.module))) {
          const pIdx = fnName === "formatInTimeZone" ? 2 : 1;
          const pat = resolveString(args[pIdx], env);
          return { kind: "date", ok: !!pat && KO_DATEFNS.test(pat), why: "date-fns " + fnName + " pattern " + JSON.stringify(pat === undefined ? null : pat) };
        }
        return null;
      }
      if (imp) {
        // dayjs()/moment() called directly yields an object, not a rendered string
        return null;
      }
      if (ts.isPropertyAccessExpression(callee)) {
        const m = callee.name.text;
        const recv = strip(callee.expression);
        // dayjs / moment chains
        if (m === "format") {
          let root = recv;
          while (root && (ts.isCallExpression(root) || ts.isPropertyAccessExpression(root))) root = strip(root.expression);
          if (root && ts.isIdentifier(root)) {
            const ri = importOf(root);
            if (ri && /^(dayjs|moment|moment-timezone)(\/.*)?$/.test(ri.module)) {
              const pat = resolveString(args[0], env);
              return { kind: "date", ok: !!pat && KO_DAYJS.test(pat), why: ri.module + " format pattern " + JSON.stringify(pat === undefined ? null : pat) };
            }
            if (ri) return null; // e.g. util.format: not date rendering
          }
          // Intl.NumberFormat / Intl.DateTimeFormat instance .format(x)
          const rr = resolve(recv, env, depth);
          if (isIntlCtor(rr.node, "NumberFormat")) {
            const a = rr.node.arguments || [];
            return numFmt(resolveLocale(a[0], rr.env), optProp(a[1], rr.env, "currency"), optProp(a[1], rr.env, "style"));
          }
          if (isIntlCtor(rr.node, "DateTimeFormat")) return { kind: "date", ok: false, why: "Intl.DateTimeFormat output" };
        }
        if (isDateType(recv) && DATE_METHODS.has(m)) return { kind: "date", ok: false, why: "Date." + m };
        if (m === "toLocaleString" && isNumType(recv)) {
          return numFmt(resolveLocale(args[0], env), optProp(args[1], env, "currency"), optProp(args[1], env, "style"));
        }
        if ((m === "toFixed" || m === "toString" || m === "toPrecision") && isNumType(recv)) return { kind: "num", ko: false, why: "number." + m };
        if (STR_METHODS.has(m)) {
          const r = classify(recv, env, depth + 1);
          if (r) return r;
        }
      }
      if (ts.isIdentifier(callee) && (callee.text === "String") && isLib(symOf(callee)) && args.length) return classify(args[0], env, depth + 1);
      // local function: analyse its returned values with parameters bound to the arguments
      const fsym = symOf(ts.isPropertyAccessExpression(callee) ? callee.name : callee);
      const fn = functionLike(fsym);
      if (fn) {
        const nenv = new Map();
        fn.parameters.forEach((p, i) => {
          if (ts.isIdentifier(p.name) && i < args.length) { const ps = symOf(p.name); if (ps) nenv.set(ps, { expr: args[i], env }); }
        });
        const r = combine(returnExprs(fn).map((x) => classify(x, nenv, depth + 1)));
        if (r) return r;
      }
      return typeFallback(e);
    };

    // Date component produced by manual assembly (getFullYear / getMonth / getDate)
    const dateComponent = (e0, env, depth) => {
      let comp = null, padded = false, legacyYear = false;
      const seen = new Set();
      const walk = (n, nenv, d) => {
        if (!n || d > MAXD) return;
        n = strip(n);
        if (!n || seen.has(n)) return;
        seen.add(n);
        if (ts.isIdentifier(n)) {
          const r = resolve(n, nenv, d);
          if (r.node !== n) walk(r.node, r.env, d + 1);
          return;
        }
        if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(strip(n.expression))) {
          const c = strip(n.expression);
          const nm = c.name.text;
          if (/^get(UTC)?FullYear$/.test(nm) || nm === "getYear") { comp = comp || "year"; if (nm === "getYear") legacyYear = true; }
          else if (/^get(UTC)?Month$/.test(nm)) comp = comp || "month";
          else if (/^get(UTC)?Date$/.test(nm)) comp = comp || "day";
          if (nm === "padStart" && n.arguments.length) {
            const len = n.arguments[0];
            if (ts.isNumericLiteral(len) && Number(len.text) >= 2) padded = true;
          }
          if (nm === "slice" && n.arguments.length === 1) {
            const a = n.arguments[0];
            if (ts.isPrefixUnaryExpression(a) && a.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(a.operand) && a.operand.text === "2") padded = true;
          }
        }
        ts.forEachChild(n, (ch) => walk(ch, nenv, d + 1));
      };
      walk(e0, env, depth);
      return comp ? { comp, padded, legacyYear } : null;
    };

    // flatten a template literal / "+" chain into parts [{text}|{expr}]
    const flatten = (e) => {
      e = strip(e);
      if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.PlusToken) return flatten(e.left).concat(flatten(e.right));
      if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return [{ text: e.text, node: e }];
      if (ts.isTemplateExpression(e)) {
        const out = [{ text: e.head.text, node: e.head }];
        for (const s of e.templateSpans) { out.push({ expr: s.expression }); out.push({ text: s.literal.text, node: s.literal }); }
        return out;
      }
      return [{ expr: e }];
    };

    // Analyse one part list: returns [{node, res}] for each date / money instance.
    const analyzeParts = (parts, env, depth) => {
      const out = [];
      const textAfter = (i) => { let s = ""; for (let j = i + 1; j < parts.length && parts[j].text !== undefined; j++) s += parts[j].text; return s; };
      const textBefore = (i) => { let s = ""; for (let j = i - 1; j >= 0 && parts[j].text !== undefined; j--) s = parts[j].text + s; return s; };
      const comps = [];
      parts.forEach((p, i) => {
        if (p.expr === undefined) return;
        const r = classify(p.expr, env, depth);
        if (r && (r.kind === "date" || r.kind === "money")) { out.push({ node: p.expr, res: r }); return; }
        const dc = dateComponent(p.expr, env, depth);
        if (dc) { comps.push({ i, node: p.expr, dc }); return; }
        if (r && r.kind === "num") {
          const after = textAfter(i).replace(/^\s+/, "");
          const before = textBefore(i).replace(/\s+$/, "");
          if (/^(원|₩|KRW|USD|EUR|JPY|달러|엔|위안|유로|\$|€|£|¥)/.test(after) || /(₩|\$|€|£|¥|KRW|USD|EUR|JPY)$/.test(before)) {
            const okWon = /^원/.test(after) && r.ko && !/(\$|€|£|¥|USD|EUR|JPY)$/.test(before);
            out.push({ node: p.expr, res: { kind: "money", ok: okWon, why: r.why + " followed by " + JSON.stringify(after.slice(0, 3)) } });
          }
        }
      });
      if (comps.length) {
        const y = comps.find((c) => c.dc.comp === "year");
        const mo = comps.find((c) => c.dc.comp === "month");
        const dd = comps.find((c) => c.dc.comp === "day");
        let ok = !!(y && mo && dd) && y.i < mo.i && mo.i < dd.i && !y.dc.legacyYear && mo.dc.padded && dd.dc.padded;
        if (ok) {
          ok = /^년\s*$/.test(between(parts, y.i, mo.i)) && /^월\s*$/.test(between(parts, mo.i, dd.i)) && /^일/.test(textAfter(dd.i));
        }
        out.push({ node: comps[0].node, res: { kind: "date", ok, why: "manual date assembly " + (ok ? "yyyy년 MM월 dd일" : "not in yyyy년 MM월 dd일 form") } });
      }
      return out;
    };
    const between = (parts, a, b) => {
      let s = "";
      for (let j = a + 1; j < b; j++) { if (parts[j].text === undefined) return "\u0000"; s += parts[j].text; }
      return s;
    };

    const ev = [];
    const done = new Set();
    let bad = 0;
    const record = (list) => {
      for (const { node, res } of list) {
        if (done.has(node)) continue;
        done.add(node);
        if (!res.ok) bad += 1;
        const p = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        ev.push({ line: p.line + 1, column: p.character + 1,
          node_kind: "TemplateSpan:" + res.kind + ":" + (res.ok ? "conforming" : "nonconforming") + " (" + res.why + ")",
          text: node.getText(sourceFile).split("\n")[0] });
      }
    };
    const isPlus = (n) => n && ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.PlusToken;
    const visit = (n) => {
      let parts = null;
      if (isPlus(n) && !isPlus(n.parent)) parts = flatten(n);
      else if (ts.isTemplateExpression(n) && !isPlus(n.parent) && !ts.isTaggedTemplateExpression(n.parent)) parts = flatten(n);
      else if (ts.isJsxElement(n) || ts.isJsxFragment(n)) {
        parts = [];
        for (const c of n.children) {
          if (ts.isJsxText(c)) parts.push({ text: c.text, node: c });
          else if (ts.isJsxExpression(c) && c.expression) parts.push({ expr: c.expression });
        }
      }
      if (parts && parts.some((p) => p.text !== undefined && HANGUL.test(p.text)) && parts.some((p) => p.expr !== undefined)) {
        record(analyzeParts(parts, undefined, 0));
      }
      ts.forEachChild(n, visit);
    };
    visit(sourceFile);
    if (ev.length === 0) return { outcome: "NOT_APPLICABLE", evidence: [] };
    return { outcome: bad ? "VIOLATED" : "SATISFIED", evidence: ev };
  },
};
