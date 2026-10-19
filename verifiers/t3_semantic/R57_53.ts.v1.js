// R57_53 (T3): "Avoid 'use client' unless needed for Web APIs."
// Governed construct: a "use client" directive in the module's directive prologue (one per file).
// The directive conforms when the file references, in a value position, at least one browser
// Web API global: an identifier whose symbol resolves (via the checker) to a top-level
// declaration in the default DOM library (lib.dom*.d.ts). Local declarations, parameters,
// destructured props and imports that shadow such names do not resolve there, and comments and
// strings are never identifiers. Globals that lib.dom declares but that are also available on
// the server runtime (console, timers, fetch, URL, TextEncoder, ...) are not counted as a need
// for the client: they do not require 'use client'. Type-only mentions (e.g. HTMLDivElement in
// a type annotation) are not uses of a Web API.
const SERVER_AVAILABLE = new Set([
  "console", "setTimeout", "clearTimeout", "setInterval", "clearInterval", "queueMicrotask",
  "structuredClone", "fetch", "Request", "Response", "Headers", "URL", "URLSearchParams",
  "TextEncoder", "TextDecoder", "TextEncoderStream", "TextDecoderStream", "AbortController",
  "AbortSignal", "atob", "btoa", "Blob", "File", "FormData", "ReadableStream", "WritableStream",
  "TransformStream", "ByteLengthQueuingStrategy", "CountQueuingStrategy", "Event", "EventTarget",
  "CustomEvent", "MessageChannel", "MessagePort", "MessageEvent", "BroadcastChannel",
  "DOMException", "WebAssembly", "CompressionStream", "DecompressionStream", "reportError",
  "crypto", "Crypto", "SubtleCrypto", "CryptoKey", "performance", "Performance",
]);

module.exports = {
  tier: "T3",
  verify(ctx) {
    const { ts, sourceFile, checker, program } = ctx;
    const where = (n) => sourceFile.getLineAndCharacterOfPosition(n.getStart(sourceFile));
    const item = (n, kind, text) => {
      const p = where(n);
      return { line: p.line + 1, column: p.character + 1, node_kind: kind, text };
    };

    // 1. Find the directive in the prologue.
    let directive;
    for (const st of sourceFile.statements) {
      if (ts.isExpressionStatement(st) && ts.isStringLiteral(st.expression)) {
        if (st.expression.text === "use client") { directive = st; break; }
        continue;
      }
      break;
    }
    if (!directive) return { outcome: "NOT_APPLICABLE", evidence: [] };

    const isDomLibFile = (sf) => {
      if (!program.isSourceFileDefaultLibrary(sf)) return false;
      const f = sf.fileName.toLowerCase();
      const base = f.slice(f.lastIndexOf("/") + 1);
      return base.startsWith("lib.dom.") && base.endsWith(".d.ts");
    };
    const isDomGlobal = (sym) => !!sym && (sym.declarations || []).some((d) => {
      if (!isDomLibFile(d.getSourceFile())) return false;
      // top-level declaration: declare var / declare function / declare class
      let top = d;
      if (ts.isVariableDeclaration(top)) top = top.parent && top.parent.parent; // VariableStatement
      return !!top && top.parent === d.getSourceFile() &&
        (ts.isVariableStatement(top) || ts.isFunctionDeclaration(top) || ts.isClassDeclaration(top));
    });

    const uses = [];
    const visit = (n) => {
      if (ts.isTypeNode(n) && !ts.isExpressionWithTypeArguments(n)) return;
      if (ts.isInterfaceDeclaration(n) || ts.isTypeAliasDeclaration(n)) return;
      if (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) return;
      if (ts.isIdentifier(n)) {
        const par = n.parent;
        // skip identifiers that are names, not references
        const isName =
          (par && par.name === n && !ts.isPropertyAccessExpression(par) && !ts.isShorthandPropertyAssignment(par)) ||
          (par && ts.isPropertyAccessExpression(par) && par.name === n &&
            !(ts.isIdentifier(par.expression) && par.expression.text === "globalThis")) ||
          (par && (ts.isJsxOpeningElement(par) || ts.isJsxSelfClosingElement(par) || ts.isJsxClosingElement(par)) && par.tagName === n) ||
          (par && ts.isJsxAttribute(par)) ||
          (par && ts.isQualifiedName(par)) ||
          (par && (ts.isLabeledStatement(par) || ts.isBreakOrContinueStatement(par)));
        if (!isName && !SERVER_AVAILABLE.has(n.text)) {
          let sym;
          if (par && ts.isShorthandPropertyAssignment(par) && par.name === n) {
            sym = checker.getShorthandAssignmentValueSymbol(par);
          } else {
            sym = checker.getSymbolAtLocation(n);
          }
          if (isDomGlobal(sym)) {
            const stmtText = n.getText(sourceFile);
            uses.push(item(n, "Identifier:dom-global", stmtText));
          }
        }
      }
      ts.forEachChild(n, visit);
    };
    for (const st of sourceFile.statements) if (st !== directive) visit(st);

    const dirText = directive.getText(sourceFile);
    if (uses.length === 0) {
      return {
        outcome: "VIOLATED",
        evidence: [item(directive, "ExpressionStatement:use-client-without-web-api", dirText)],
      };
    }
    return {
      outcome: "SATISFIED",
      evidence: [item(directive, "ExpressionStatement:use-client", dirText)].concat(uses),
    };
  },
};
