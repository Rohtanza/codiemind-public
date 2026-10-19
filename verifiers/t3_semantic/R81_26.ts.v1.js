// R81_26 (T3): "Use OpenMeteo API." Governed construct: a weather-data request, i.e. an HTTP
// request call (platform fetch, axios incl. axios.create instances, got/ky/node-fetch/undici/
// superagent/needle/ofetch/..., node http(s).get/request, XMLHttpRequest#open, jQuery ajax)
// whose URL resolves to a weather-data provider host, or a call/construction through a
// weather-provider SDK (the official `openmeteo` package conforms; openweather-api-node etc.
// violate). The URL is found by following bindings from the request's URL argument back to
// its value: const initialisers, object-literal properties, template/concatenation pieces,
// `new URL(path, base)`, local URL-builder functions' return values, and function parameters
// via the call sites in this file. A provider URL that never flows into a request (a log
// message, a blocklist) is not an instance. Requests whose host is neither Open-Meteo nor a
// known weather provider (unrelated APIs) are not instances. Platform fetch is identified by
// resolving the callee to a default-library declaration; library calls by the import or
// require() that binds the callee's root identifier.
module.exports = {
  tier: "T3",
  verify(ctx) {
    const { ts, sourceFile, checker, program } = ctx;
    const UNK = "\u0001";
    const OPEN_METEO = "open-meteo.com";
    const PROVIDERS = [
      "openweathermap.org", "openweather.org", "openweather.co.uk", "weatherapi.com",
      "tomorrow.io", "climacell.co", "weatherbit.io", "visualcrossing.com", "weather.gov",
      "accuweather.com", "weatherstack.com", "darksky.net", "forecast.io", "meteomatics.com",
      "aerisapi.com", "xweather.com", "met.no", "meteoblue.com", "weather.com",
      "pirateweather.net", "stormglass.io", "meteosource.com", "worldweatheronline.com",
      "weatherkit.apple.com", "weather.googleapis.com", "weather.gc.ca", "weatherunlocked.com",
      "weather.visualcrossing.com", "metoffice.gov.uk", "datahub.metoffice.gov.uk",
      "brightsky.dev", "weather.bom.gov.au", "api.weather.yandex.ru", "qweather.com",
      "openweathermap.com", "wunderground.com", "ambeedata.com", "oikolab.com",
    ];
    const HTTP_LIBS = new Set([
      "axios", "redaxios", "got", "ky", "ky-universal", "node-fetch", "cross-fetch",
      "isomorphic-fetch", "isomorphic-unfetch", "unfetch", "undici", "superagent", "needle",
      "request", "request-promise", "request-promise-native", "phin", "ofetch", "wretch",
      "make-fetch-happen", "bent", "http", "https", "node:http", "node:https", "jquery",
      "@angular/common/http", "simple-get", "minipass-fetch", "axios/index",
    ]);
    const NODE_HTTP = new Set(["http", "https", "node:http", "node:https"]);
    const isOpenMeteoPkg = (m) => /^(@openmeteo\/|openmeteo$|open-meteo$|@open-meteo\/)/i.test(m);
    const isProviderPkg = (m) => !isOpenMeteoPkg(m) &&
      /openweather|weatherapi|tomorrow-?io|@tomorrowio|climacell|weatherbit|accuweather|visualcrossing|visual-crossing|darksky|dark-sky|weatherstack|weather-js|meteomatics|weatherkit|pirateweather|meteoblue|stormglass|meteosource|aerisweather|xweather|wunderground|weather-gov|weathergov|national-weather-service/i.test(m);
    const NON_REQUEST_METHODS = new Set([
      "create", "extend", "defaults", "interceptors", "use", "isAxiosError", "isCancel",
      "CancelToken", "all", "spread", "mergeConfig", "getUri", "toFormData", "formToJSON",
      "Agent", "createServer", "Server", "STATUS_CODES", "METHODS", "globalAgent",
    ]);
    const XHR_LIKE = /XMLHttpRequest/;

    const ev = [];
    let bad = 0;
    const where = (n) => sourceFile.getLineAndCharacterOfPosition(n.getStart(sourceFile));
    const isLibDecl = (d) => program.isSourceFileDefaultLibrary(d.getSourceFile());
    const isLib = (sym) => !!sym && (sym.declarations || []).some(isLibDecl);
    const symAt = (n) => { try { return checker.getSymbolAtLocation(n); } catch (e) { return undefined; } };
    const strip = (e) => {
      while (e && (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isNonNullExpression(e) ||
        ts.isTypeAssertionExpression(e) || (ts.isSatisfiesExpression && ts.isSatisfiesExpression(e)) ||
        ts.isAwaitExpression(e))) e = e.expression;
      return e;
    };
    const declsOf = (sym) => (sym && sym.declarations) ? sym.declarations : [];

    // all calls in this file, for parameter flow
    const allCalls = [];
    const collect = (n) => { if (ts.isCallExpression(n) || ts.isNewExpression(n)) allCalls.push(n); ts.forEachChild(n, collect); };
    collect(sourceFile);

    const calleeNameNode = (callee) => {
      callee = strip(callee);
      if (ts.isPropertyAccessExpression(callee)) return callee.name;
      return callee;
    };
    const isPureChain = (e) => {
      e = strip(e);
      while (ts.isPropertyAccessExpression(e)) e = strip(e.expression);
      return ts.isIdentifier(e) || e.kind === ts.SyntaxKind.ThisKeyword;
    };
    const chainRoot = (e) => {
      e = strip(e);
      while (ts.isPropertyAccessExpression(e)) e = strip(e.expression);
      return ts.isIdentifier(e) ? e : undefined;
    };

    // ---- module origin of an identifier (import / require / alias / instance) ----
    const moduleOfDeclaration = (d) => {
      let p = d;
      while (p && !ts.isImportDeclaration(p) && !ts.isImportEqualsDeclaration(p) && !ts.isSourceFile(p)) p = p.parent;
      if (p && ts.isImportDeclaration(p) && ts.isStringLiteral(p.moduleSpecifier)) return p.moduleSpecifier.text;
      if (p && ts.isImportEqualsDeclaration(p) && ts.isExternalModuleReference(p.moduleReference) &&
        ts.isStringLiteral(p.moduleReference.expression)) return p.moduleReference.expression.text;
      return undefined;
    };
    const requireTarget = (init) => {
      init = strip(init);
      if (init && ts.isCallExpression(init)) {
        const c = strip(init.expression);
        const a = init.arguments[0];
        if (a && ts.isStringLiteralLike(a) &&
          ((ts.isIdentifier(c) && c.text === "require") || c.kind === ts.SyntaxKind.ImportKeyword)) return a.text;
      }
      if (init && ts.isPropertyAccessExpression(init)) return requireTarget(init.expression);
      return undefined;
    };
    // returns { module, cfg } or undefined; cfg = axios.create(...) config expression
    const originOfExpr = (e, depth) => {
      e = strip(e);
      if (!e || depth > 10) return undefined;
      const rq = requireTarget(e);
      if (rq) return { module: rq };
      if (ts.isIdentifier(e)) return originOfId(e, depth + 1);
      if (ts.isPropertyAccessExpression(e)) {
        const r = chainRoot(e);
        return r ? originOfId(r, depth + 1) : undefined;
      }
      if (ts.isCallExpression(e)) {
        const c = strip(e.expression);
        if (ts.isPropertyAccessExpression(c) && (c.name.text === "create" || c.name.text === "extend")) {
          const o = originOfExpr(c.expression, depth + 1);
          if (o) return { module: o.module, cfg: e.arguments[0] || o.cfg };
        }
        return undefined;
      }
      if (ts.isNewExpression(e)) {
        const o = originOfExpr(e.expression, depth + 1);
        if (o) return { module: o.module, instance: true };
      }
      return undefined;
    };
    const originOfId = (id, depth) => {
      if (depth > 10) return undefined;
      const sym = symAt(id);
      for (const d of declsOf(sym)) {
        const m = moduleOfDeclaration(d);
        if (m) return { module: m };
        let v = d;
        if (ts.isBindingElement(v)) { while (v && !ts.isVariableDeclaration(v)) v = v.parent; }
        if (v && ts.isVariableDeclaration(v) && v.initializer) {
          const o = originOfExpr(v.initializer, depth + 1);
          if (o) return o;
        }
      }
      return undefined;
    };

    // ---- string value resolution: returns an array of candidate strings (UNK = unknown) ----
    const CAP = 24;
    const product = (lists) => {
      let out = [""];
      for (const l of lists) {
        const next = [];
        for (const a of out) for (const b of l) { if (next.length < CAP) next.push(a + b); }
        out = next;
      }
      return out;
    };
    const uniq = (arr) => { const s = new Set(arr); return [...s].slice(0, CAP); };
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
    const functionOf = (sym) => {
      for (const d of declsOf(sym)) {
        if (isLibDecl(d)) return undefined;
        if ((ts.isFunctionDeclaration(d) || ts.isMethodDeclaration(d)) && d.body) return d;
        if ((ts.isVariableDeclaration(d) || ts.isPropertyAssignment(d) || ts.isPropertyDeclaration(d)) && d.initializer) {
          const i = strip(d.initializer);
          if (ts.isArrowFunction(i) || ts.isFunctionExpression(i)) return i;
        }
      }
      return undefined;
    };
    const fnNameSymbol = (fn) => {
      if ((ts.isFunctionDeclaration(fn) || ts.isMethodDeclaration(fn)) && fn.name) return symAt(fn.name);
      const p = fn.parent;
      if (p && (ts.isVariableDeclaration(p) || ts.isPropertyAssignment(p) || ts.isPropertyDeclaration(p)) && p.name) return symAt(p.name);
      return undefined;
    };
    const objectLiteralOf = (e, depth, seen) => {
      e = strip(e);
      if (!e || depth > 12) return undefined;
      if (ts.isObjectLiteralExpression(e)) return e;
      if (ts.isIdentifier(e)) {
        for (const d of declsOf(symAt(e))) {
          if (ts.isVariableDeclaration(d) && d.initializer && !seen.has(d)) {
            seen.add(d);
            return objectLiteralOf(d.initializer, depth + 1, seen);
          }
        }
      }
      if (ts.isPropertyAccessExpression(e)) {
        const o = objectLiteralOf(e.expression, depth + 1, seen);
        const p = o && propOf(o, e.name.text);
        if (p) return objectLiteralOf(p, depth + 1, seen);
      }
      return undefined;
    };
    const propOf = (obj, name) => {
      for (const p of obj.properties) {
        if (!p.name) continue;
        const k = ts.isIdentifier(p.name) || ts.isStringLiteralLike(p.name) ? p.name.text : undefined;
        if (k !== name) continue;
        if (ts.isPropertyAssignment(p)) return p.initializer;
        if (ts.isShorthandPropertyAssignment(p)) return p.name;
      }
      return undefined;
    };
    const evalStr = (e, depth, seen) => {
      e = strip(e);
      if (!e || depth > 14) return [UNK];
      if (ts.isStringLiteralLike(e)) return [e.text];
      if (ts.isTemplateExpression(e)) {
        const parts = [[e.head.text]];
        for (const s of e.templateSpans) { parts.push(evalStr(s.expression, depth + 1, seen)); parts.push([s.literal.text]); }
        return product(parts);
      }
      if (ts.isBinaryExpression(e)) {
        const k = e.operatorToken.kind;
        if (k === ts.SyntaxKind.PlusToken) return product([evalStr(e.left, depth + 1, seen), evalStr(e.right, depth + 1, seen)]);
        if (k === ts.SyntaxKind.BarBarToken || k === ts.SyntaxKind.QuestionQuestionToken)
          return uniq(evalStr(e.left, depth + 1, seen).concat(evalStr(e.right, depth + 1, seen)));
        return [UNK];
      }
      if (ts.isConditionalExpression(e))
        return uniq(evalStr(e.whenTrue, depth + 1, seen).concat(evalStr(e.whenFalse, depth + 1, seen)));
      if (ts.isNewExpression(e)) {
        const c = strip(e.expression);
        const args = e.arguments || [];
        if (ts.isIdentifier(c) && c.text === "URL" && args[0]) {
          const a = evalStr(args[0], depth + 1, seen);
          if (!args[1]) return a;
          const b = evalStr(args[1], depth + 1, seen);
          const out = [];
          for (const x of a) {
            if (hostOf(x) !== null || /^[a-z][a-z0-9+.-]*:/i.test(x)) out.push(x);
            else for (const y of b) out.push(joinUrl(y, x));
          }
          return uniq(out);
        }
        if (ts.isIdentifier(c) && c.text === "Request" && args[0]) return evalStr(args[0], depth + 1, seen);
        return [UNK];
      }
      if (ts.isCallExpression(e)) {
        const c = strip(e.expression);
        if (ts.isPropertyAccessExpression(c)) {
          const m = c.name.text;
          if (m === "toString" || m === "trim" || m === "toLowerCase" || m === "valueOf") return evalStr(c.expression, depth + 1, seen);
          if (m === "concat") return product([evalStr(c.expression, depth + 1, seen)].concat(e.arguments.map((a) => evalStr(a, depth + 1, seen))));
        }
        if (ts.isIdentifier(c) && (c.text === "String" || c.text === "encodeURI") && e.arguments[0])
          return evalStr(e.arguments[0], depth + 1, seen);
        const fn = functionOf(symAt(calleeNameNode(c)));
        if (fn && !seen.has(fn)) {
          seen.add(fn);
          let out = [];
          for (const r of returnExprs(fn)) out = out.concat(evalStr(r, depth + 1, seen));
          seen.delete(fn);
          return out.length ? uniq(out) : [UNK];
        }
        return [UNK];
      }
      if (ts.isIdentifier(e) || ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e)) {
        let sym;
        if (ts.isIdentifier(e)) sym = symAt(e);
        else if (ts.isPropertyAccessExpression(e)) sym = symAt(e.name);
        else sym = symAt(e.argumentExpression);
        let out = [];
        for (let d of declsOf(sym)) {
          if (seen.has(d) || isLibDecl(d)) continue;
          seen.add(d);
          if (ts.isShorthandPropertyAssignment(d)) {
            const vs = checker.getShorthandAssignmentValueSymbol(d);
            const vd = declsOf(vs)[0];
            if (vd && vd.initializer) out = out.concat(evalStr(vd.initializer, depth + 1, seen));
            else if (vd && ts.isParameter(vd)) out = out.concat(paramValues(vd, depth, seen));
          } else if ((ts.isVariableDeclaration(d) || ts.isPropertyAssignment(d) || ts.isPropertyDeclaration(d) || ts.isEnumMember(d)) && d.initializer) {
            out = out.concat(evalStr(d.initializer, depth + 1, seen));
          } else if (ts.isParameter(d)) {
            out = out.concat(paramValues(d, depth, seen));
          } else if (ts.isBindingElement(d)) {
            // const { url } = CONFIG
            const key = d.propertyName && (ts.isIdentifier(d.propertyName) || ts.isStringLiteralLike(d.propertyName))
              ? d.propertyName.text : (ts.isIdentifier(d.name) ? d.name.text : undefined);
            let v = d.parent && d.parent.parent;
            if (key && v && ts.isVariableDeclaration(v) && v.initializer && ts.isObjectBindingPattern(d.parent)) {
              const o = objectLiteralOf(v.initializer, depth + 1, new Set());
              const p = o && propOf(o, key);
              if (p) out = out.concat(evalStr(p, depth + 1, seen));
              else if (d.initializer) out = out.concat(evalStr(d.initializer, depth + 1, seen));
            } else if (d.initializer) out = out.concat(evalStr(d.initializer, depth + 1, seen));
          }
          seen.delete(d);
        }
        if (!out.length && ts.isPropertyAccessExpression(e)) {
          if (e.name.text === "href") return evalStr(e.expression, depth + 1, seen);
          const o = objectLiteralOf(e.expression, depth + 1, new Set());
          const p = o && propOf(o, e.name.text);
          if (p) return evalStr(p, depth + 1, seen);
        }
        if (!out.length && ts.isElementAccessExpression(e) && ts.isStringLiteralLike(e.argumentExpression)) {
          const o = objectLiteralOf(e.expression, depth + 1, new Set());
          const p = o && propOf(o, e.argumentExpression.text);
          if (p) return evalStr(p, depth + 1, seen);
        }
        return out.length ? uniq(out) : [UNK];
      }
      return [UNK];
    };
    const paramValues = (param, depth, seen) => {
      const fn = param.parent;
      const idx = fn.parameters ? fn.parameters.indexOf(param) : -1;
      let out = [];
      const fsym = idx >= 0 ? fnNameSymbol(fn) : undefined;
      if (fsym) {
        for (const c of allCalls) {
          if (!ts.isCallExpression(c)) continue;
          if (symAt(calleeNameNode(c.expression)) !== fsym) continue;
          const a = c.arguments[idx];
          if (a) out = out.concat(evalStr(a, depth + 1, seen));
          else if (param.initializer) out = out.concat(evalStr(param.initializer, depth + 1, seen));
        }
      }
      if (!out.length && param.initializer) out = evalStr(param.initializer, depth + 1, seen);
      return out.length ? uniq(out) : [UNK];
    };
    const hostOf = (s) => {
      const m = /^\s*(?:[a-z][a-z0-9+.-]*:)?\/\/([^\/?#\s]*)/i.exec(s);
      if (!m) return null;
      let h = m[1];
      const at = h.lastIndexOf("@");
      if (at >= 0) h = h.slice(at + 1);
      h = h.replace(/:\d*$/, "");
      if (!h || h.indexOf(UNK) >= 0) return null;
      return h.toLowerCase().replace(/\.$/, "");
    };
    const joinUrl = (base, path) => {
      if (hostOf(path) !== null) return path;
      if (!base || base === UNK) return path;
      if (base.endsWith("/") && path.startsWith("/")) return base + path.slice(1);
      if (!base.endsWith("/") && !path.startsWith("/") && path !== "" && !path.startsWith("?")) return base + "/" + path;
      return base + path;
    };
    const hostMatch = (h, d) => h === d || h.endsWith("." + d);
    // classify a set of candidate URLs: "ok" | "bad" | null (not a weather request)
    const classify = (cands) => {
      let ok = false, badHit = false;
      for (const c of cands) {
        const h = hostOf(c);
        if (h === null) continue;
        if (hostMatch(h, OPEN_METEO)) ok = true;
        else if (PROVIDERS.some((d) => hostMatch(h, d))) badHit = true;
      }
      return badHit ? "bad" : ok ? "ok" : null;
    };
    const fromHostname = (obj, depth) => {
      const hn = propOf(obj, "hostname") || propOf(obj, "host");
      if (!hn) return undefined;
      const path = propOf(obj, "path") || propOf(obj, "pathname");
      const hs = evalStr(hn, depth, new Set());
      const ps = path ? evalStr(path, depth, new Set()) : [""];
      return product([["https://"], hs, ps]);
    };
    // URL candidates of a request argument (string expression or config object)
    const urlOfArg = (arg, cfgBases) => {
      if (!arg) return [];
      const obj = objectLiteralOf(arg, 0, new Set());
      let cands;
      if (obj) {
        const u = propOf(obj, "url") || propOf(obj, "uri") || propOf(obj, "href") || propOf(obj, "input");
        const b = propOf(obj, "baseURL") || propOf(obj, "baseUrl") || propOf(obj, "prefixUrl");
        if (u) cands = evalStr(u, 0, new Set());
        else cands = fromHostname(obj, 0) || [""];
        if (b) cfgBases = cfgBases.concat(evalStr(b, 0, new Set()));
      } else {
        cands = evalStr(arg, 0, new Set());
      }
      if (!cfgBases.length) return cands;
      const out = [];
      for (const c of cands) {
        if (hostOf(c) !== null) out.push(c);
        else for (const b of cfgBases) out.push(joinUrl(b, c));
      }
      return uniq(out);
    };
    const basesOfCfg = (cfg) => {
      if (!cfg) return [];
      const obj = objectLiteralOf(cfg, 0, new Set());
      if (!obj) return [];
      const b = propOf(obj, "baseURL") || propOf(obj, "baseUrl") || propOf(obj, "prefixUrl") || propOf(obj, "prefix");
      return b ? evalStr(b, 0, new Set()) : [];
    };

    const resolveCallee = (sym) => {
      // follow local aliases of the platform function (const f = window.fetch, const { fetch: f } = globalThis)
      for (let i = 0; sym && i < 8; i++) {
        if (isLib(sym)) return sym;
        const d = declsOf(sym)[0];
        if (d && ts.isVariableDeclaration(d) && d.initializer && !d.type) {
          let init = strip(d.initializer);
          if (ts.isCallExpression(init) && ts.isPropertyAccessExpression(strip(init.expression)) &&
            strip(init.expression).name.text === "bind") init = strip(strip(init.expression).expression);
          const target = ts.isPropertyAccessExpression(init) ? init.name : init;
          sym = symAt(target);
        } else if (d && ts.isBindingElement(d) && d.parent && d.parent.parent && ts.isVariableDeclaration(d.parent.parent)) {
          const name = d.propertyName || d.name;
          const init = d.parent.parent.initializer;
          if (!init || !ts.isIdentifier(name)) return sym;
          const t = checker.getTypeAtLocation(init);
          sym = t.getProperty(name.text);
        } else {
          return sym;
        }
      }
      return sym;
    };

    const record = (n, kind, verdict) => {
      const p = where(n);
      if (verdict === "bad") bad += 1;
      ev.push({ line: p.line + 1, column: p.character + 1,
        node_kind: kind + (verdict === "bad" ? ":other-weather-provider" : ":open-meteo"),
        text: n.getText(sourceFile).split("\n")[0].slice(0, 200) });
    };

    for (const n of allCalls) {
      const callee = strip(n.expression);
      const args = n.arguments || [];
      const nameNode = calleeNameNode(callee);
      const method = ts.isPropertyAccessExpression(callee) ? callee.name.text : undefined;

      // weather SDKs (import/require-bound root, or instances created from one)
      const r = isPureChain(callee) ? chainRoot(callee) : undefined;
      const origin = r ? originOfId(r, 0) : undefined;
      if (origin && isOpenMeteoPkg(origin.module)) {
        record(n, ts.SyntaxKind[n.kind] + ":openmeteo-sdk", "ok");
        continue;
      }
      if (origin && isProviderPkg(origin.module)) {
        record(n, ts.SyntaxKind[n.kind] + ":provider-sdk(" + origin.module + ")", "bad");
        continue;
      }
      if (!ts.isCallExpression(n)) continue;

      // platform fetch
      const csym = resolveCallee(symAt(nameNode));
      if (csym && isLib(csym) && csym.getName() === "fetch") {
        const v = classify(urlOfArg(args[0], []));
        if (v) record(n, "CallExpression:platform-fetch", v);
        continue;
      }
      // XMLHttpRequest#open(method, url)
      if (method === "open" && csym && isLib(csym) &&
        declsOf(csym).some((d) => d.parent && d.parent.name && XHR_LIKE.test(d.parent.name.text))) {
        const v = classify(urlOfArg(args[1], []));
        if (v) record(n, "CallExpression:XMLHttpRequest.open", v);
        continue;
      }
      if (!r) continue;
      let mod = origin && origin.module;
      if (!mod && !symAt(r) && (r.text === "$" || r.text === "jQuery")) mod = "jquery";
      if (!mod || !HTTP_LIBS.has(mod)) continue;
      if (method && NON_REQUEST_METHODS.has(method)) continue;
      if (NODE_HTTP.has(mod) && method !== "get" && method !== "request") continue;
      const bases = basesOfCfg(origin && origin.cfg);
      let cands = urlOfArg(args[0], bases);
      // axios-style trailing config may carry baseURL
      const cfgIdx = method && /^(get|delete|head|options)$/.test(method) ? 1 : method && /^(post|put|patch)$/.test(method) ? 2 : -1;
      if (cfgIdx > 0 && args[cfgIdx]) {
        const more = basesOfCfg(args[cfgIdx]);
        if (more.length) cands = urlOfArg(args[0], bases.concat(more));
      }
      const v = classify(cands);
      if (v) record(n, "CallExpression:" + mod + (method ? "." + method : ""), v);
    }

    if (ev.length === 0) return { outcome: "NOT_APPLICABLE", evidence: [] };
    return { outcome: bad ? "VIOLATED" : "SATISFIED", evidence: ev };
  },
};
