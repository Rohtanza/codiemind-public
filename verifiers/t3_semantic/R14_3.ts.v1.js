// R14_3 (T3): "Use Vercel AI SDK for handling AI interactions and streaming responses."
// Governed construct: one AI interaction in the file. Conforming instances are calls whose callee
// is BOUND (via the checker's symbol) to an import of `ai`, `ai/*` or `@ai-sdk/*` (named, aliased,
// namespace, or require). Non-conforming instances are (a) calls / `new` expressions whose root is
// bound, directly or through local variables / class fields, to a value import of a direct
// provider SDK, and (b) HTTP requests (platform fetch, or fetch/axios-like imports) whose URL
// argument is a language-model endpoint. A local function merely NAMED like an AI SDK function is
// not bound to `ai`, so it is not a conforming instance. Type-only imports are ignored.
module.exports = {
  tier: "T3",
  verify(ctx) {
    const { ts, sourceFile, checker, program } = ctx;
    const ev = [];
    let bad = 0;
    const REQ = "requ" + "ire";

    const isAiSdk = (m) => m === "ai" || m.startsWith("ai/") || m.startsWith("@ai-sdk/");
    const AI_UI = ["@ai-sdk/react", "@ai-sdk/vue", "@ai-sdk/svelte", "@ai-sdk/solid", "@ai-sdk/ui-utils",
      "@ai-sdk/rsc", "@ai-sdk/provider", "@ai-sdk/provider-utils"];
    const AI_FUNCS = new Set(["streamText", "generateText", "streamObject", "generateObject", "embed",
      "embedMany", "generateImage", "experimental_generateImage", "generateSpeech",
      "experimental_generateSpeech", "transcribe", "experimental_transcribe", "streamUI", "useChat",
      "useCompletion", "useObject", "experimental_useObject", "useAssistant", "tool", "rerank"]);
    const PROVIDERS = new Set(["openai", "@anthropic-ai/sdk", "@anthropic-ai/bedrock-sdk",
      "@anthropic-ai/vertex-sdk", "@google/generative-ai", "@google/genai", "@google-cloud/vertexai",
      "@mistralai/mistralai", "cohere-ai", "groq-sdk", "together-ai", "replicate", "ollama",
      "@huggingface/inference", "@aws-sdk/client-bedrock-runtime", "@azure/openai", "@fireworks-ai/sdk",
      "langchain", "@langchain/openai", "@langchain/anthropic", "@langchain/google-genai",
      "@langchain/core", "@langchain/community", "@langchain/mistralai", "@langchain/groq",
      "@langchain/ollama", "openai-edge", "@xenova/transformers", "llamaindex"]);
    const isProvider = (m) => PROVIDERS.has(m) || m.startsWith("openai/") || m.startsWith("@anthropic-ai/sdk/");
    const HTTP_LIBS = new Set(["axios", "node-fetch", "undici", "cross-fetch", "isomorphic-fetch", "ky", "got",
      "ofetch", "superagent"]);
    const ENDPOINT = /(api\.openai\.com|openai\.azure\.com|api\.anthropic\.com|generativelanguage\.googleapis\.com|aiplatform\.googleapis\.com|api\.mistral\.ai|api\.groq\.com|api\.cohere\.(ai|com)|openrouter\.ai|api\.together\.(xyz|ai)|api\.fireworks\.ai|api\.deepseek\.com|api\.perplexity\.ai|api\.x\.ai|api-inference\.huggingface\.co|api\.replicate\.com|bedrock-runtime\.|:11434\/|\/v1\/chat\/completions|\/v1\/completions|\/v1\/messages\b|\/v1\/embeddings|:generateContent|:streamGenerateContent|\/api\/generate\b|\/api\/chat\b(?=.*11434))/;

    const where = (n) => sourceFile.getLineAndCharacterOfPosition(n.getStart(sourceFile));
    const push = (n, kind) => {
      const p = where(n);
      ev.push({ line: p.line + 1, column: p.character + 1, node_kind: kind,
        text: n.getText(sourceFile).split("\n")[0].slice(0, 200) });
    };
    const isLib = (sym) => !!sym && (sym.declarations || []).some(
      (d) => program.isSourceFileDefaultLibrary(d.getSourceFile()));

    const unwrap = (e) => {
      while (e && (ts.isAwaitExpression(e) || ts.isParenthesizedExpression(e) || ts.isAsExpression(e) ||
        ts.isNonNullExpression(e) || (ts.isSatisfiesExpression && ts.isSatisfiesExpression(e)) ||
        ts.isTypeAssertionExpression(e))) e = e.expression;
      return e;
    };
    // Root of a callee/initializer chain: an Identifier, or `this.x` (returned as the name node).
    const root = (e) => {
      e = unwrap(e);
      while (e) {
        if (ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e)) {
          const inner = unwrap(e.expression);
          if (inner.kind === ts.SyntaxKind.ThisKeyword && ts.isPropertyAccessExpression(e)) return e.name;
          e = inner;
        } else if (ts.isCallExpression(e) || ts.isNewExpression(e)) e = unwrap(e.expression);
        else break;
      }
      return e && ts.isIdentifier(e) ? e : undefined;
    };
    const isRequire = (e) => {
      e = unwrap(e);
      return !!e && ts.isCallExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === REQ &&
        e.arguments.length > 0 && ts.isStringLiteralLike(e.arguments[0]) ? e.arguments[0].text : undefined;
    };
    const firstMember = (expr, rootId) => {
      // name of the member accessed directly on rootId, e.g. ai.streamText -> streamText
      let e = unwrap(expr);
      let last;
      while (e && (ts.isPropertyAccessExpression(e) || ts.isCallExpression(e) || ts.isNewExpression(e))) {
        if (ts.isPropertyAccessExpression(e)) { if (unwrap(e.expression) === rootId) return e.name.text; last = e; }
        e = unwrap(e.expression);
      }
      return last ? undefined : undefined;
    };

    // Resolve an identifier to its import origin: { module, exportName, typeOnly, direct }.
    const origin = (id) => {
      let sym = checker.getSymbolAtLocation(id);
      let direct = true;
      let exportName;
      for (let i = 0; sym && i < 10; i++) {
        const d = (sym.declarations || [])[0];
        if (!d) return undefined;
        if (ts.isImportSpecifier(d) || ts.isImportClause(d) || ts.isNamespaceImport(d)) {
          let p = d;
          while (p && !ts.isImportDeclaration(p)) p = p.parent;
          if (!p || !ts.isStringLiteral(p.moduleSpecifier)) return undefined;
          const clause = p.importClause;
          const typeOnly = !!(clause && clause.isTypeOnly) || (ts.isImportSpecifier(d) && d.isTypeOnly);
          let name = exportName;
          if (name === undefined) {
            if (ts.isImportSpecifier(d)) name = (d.propertyName || d.name).text;
            else if (ts.isImportClause(d)) name = "default";
            else name = "*";
          }
          return { module: p.moduleSpecifier.text, exportName: name, typeOnly, direct, ns: ts.isNamespaceImport(d) };
        }
        if (ts.isImportEqualsDeclaration(d)) {
          const r = d.moduleReference;
          if (ts.isExternalModuleReference(r) && ts.isStringLiteral(r.expression))
            return { module: r.expression.text, exportName: exportName || "*", typeOnly: d.isTypeOnly, direct, ns: true };
          return undefined;
        }
        if (ts.isVariableDeclaration(d) && d.initializer) {
          const m = isRequire(d.initializer);
          if (m !== undefined && ts.isIdentifier(d.name))
            return { module: m, exportName: exportName || "*", typeOnly: false, direct, ns: true };
          const init = unwrap(d.initializer);
          if (!ts.isIdentifier(init)) direct = false;
          const r = root(init);
          if (!r) return undefined;
          sym = checker.getSymbolAtLocation(r);
          continue;
        }
        if (ts.isBindingElement(d)) {
          let decl = d.parent;
          while (decl && !ts.isVariableDeclaration(decl)) decl = decl.parent;
          if (!decl || !decl.initializer) return undefined;
          const pn = d.propertyName || d.name;
          const m = isRequire(decl.initializer);
          if (m !== undefined)
            return { module: m, exportName: ts.isIdentifier(pn) ? pn.text : "*", typeOnly: false, direct, ns: false };
          if (ts.isIdentifier(unwrap(decl.initializer)) && ts.isIdentifier(pn) && exportName === undefined) {
            exportName = pn.text; // const { streamText } = ai  (namespace destructure)
          } else direct = false;
          const r = root(decl.initializer);
          if (!r) return undefined;
          sym = checker.getSymbolAtLocation(r);
          continue;
        }
        if ((ts.isPropertyDeclaration(d) || ts.isPropertyAssignment(d)) && d.initializer) {
          direct = false;
          const r = root(d.initializer);
          if (!r) return undefined;
          sym = checker.getSymbolAtLocation(r);
          continue;
        }
        if (ts.isParameter(d) && d.parent && ts.isConstructorDeclaration(d.parent)) return undefined;
        return undefined;
      }
      return undefined;
    };

    const urlText = (arg, depth) => {
      if (!arg || depth > 4) return undefined;
      arg = unwrap(arg);
      if (ts.isStringLiteralLike(arg)) return arg.text;
      if (ts.isTemplateExpression(arg)) {
        let s = arg.head.text;
        for (const sp of arg.templateSpans) s += "${}" + (urlText(sp.expression, depth + 1) || "") + sp.literal.text;
        return s;
      }
      if (ts.isBinaryExpression(arg) && arg.operatorToken.kind === ts.SyntaxKind.PlusToken)
        return (urlText(arg.left, depth + 1) || "") + (urlText(arg.right, depth + 1) || "");
      if (ts.isNewExpression(arg) && arg.arguments && arg.arguments.length)
        return arg.arguments.map((a) => urlText(a, depth + 1) || "").join("");
      if (ts.isIdentifier(arg) || ts.isPropertyAccessExpression(arg)) {
        const sym = checker.getSymbolAtLocation(ts.isIdentifier(arg) ? arg : arg.name);
        const d = sym && (sym.declarations || [])[0];
        if (d && (ts.isVariableDeclaration(d) || ts.isPropertyAssignment(d) || ts.isPropertyDeclaration(d)) && d.initializer)
          return urlText(d.initializer, depth + 1);
      }
      if (ts.isObjectLiteralExpression(arg)) {
        for (const p of arg.properties)
          if (ts.isPropertyAssignment(p) && p.name && ["url", "baseURL", "baseUrl"].includes(p.name.getText(sourceFile)))
            return urlText(p.initializer, depth + 1);
      }
      return undefined;
    };
    const isEndpointCall = (n) => n.arguments && n.arguments.some((a) => {
      const s = urlText(a, 0);
      return s !== undefined && ENDPOINT.test(s);
    });

    const visit = (n) => {
      if (ts.isCallExpression(n) || ts.isNewExpression(n)) {
        const callee = unwrap(n.expression);
        const r = root(callee);
        const o = r ? origin(r) : undefined;
        if (o && !o.typeOnly && isProvider(o.module)) {
          bad += 1;
          push(n, (ts.isNewExpression(n) ? "NewExpression" : "CallExpression") + ":provider-sdk(" + o.module + ")");
        } else if (o && !o.typeOnly && isAiSdk(o.module) && ts.isCallExpression(n) && o.direct) {
          let name = o.exportName;
          if (name === "*" || name === "default") name = firstMember(callee, r) || name;
          const calleeIsMember = unwrap(callee) === r ||
            (ts.isPropertyAccessExpression(callee) && unwrap(callee.expression) === r && (o.ns || o.exportName === "*"));
          const isProviderPkg = o.module.startsWith("@ai-sdk/") && !AI_UI.includes(o.module);
          if (calleeIsMember && (AI_FUNCS.has(name) || isProviderPkg))
            push(n, "CallExpression:ai-sdk(" + o.module + ":" + name + ")");
        } else if (ts.isCallExpression(n) && isEndpointCall(n)) {
          const nameNode = ts.isPropertyAccessExpression(callee) ? callee.name : callee;
          const sym = ts.isIdentifier(nameNode) || ts.isPrivateIdentifier(nameNode) ? checker.getSymbolAtLocation(nameNode) : undefined;
          const platformFetch = !!sym && isLib(sym) && sym.getName() === "fetch";
          const httpLib = !!o && HTTP_LIBS.has(o.module);
          if (platformFetch || httpLib) {
            bad += 1;
            push(n, "CallExpression:http-to-model-endpoint");
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
