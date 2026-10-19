// R74_90 (T3): "Use Firebase Storage for handling user-generated content."
// Governed construct: a call (or S3 command construction) that writes user content to a storage
// service. Each instance is attributed to the module its callee is BOUND to: the checker resolves
// identifiers to their declarations, and the verifier follows variable initialisers, destructuring,
// property/call chains, class property initialisers, type annotations, `require(...)` and dynamic
// `import(...)` back to an import. The callee's NAME never decides the verdict: a local function
// called `uploadBytes` is not Firebase (its body is analysed on its own), and a firebase-admin
// `bucket.upload()` is Firebase despite the generic name.
// Firebase Storage write  -> conforming instance.  Other storage SDK write -> violating instance.
// No instance -> NOT_APPLICABLE. Reads/downloads/URL retrieval are not instances.
module.exports = {
  tier: "T3",
  verify(ctx) {
    const { ts, sourceFile, checker } = ctx;

    const FB_DIRECT = ["firebase/storage", "firebase/compat/storage", "firebase-admin/storage",
      "@firebase/storage", "firebase-admin/lib/storage"];
    // umbrella entry points: Firebase Storage only when the chain goes through `.storage`
    const FB_UMBRELLA = ["firebase", "firebase/app", "firebase/compat/app", "firebase/compat",
      "firebase-admin", "firebase-admin/app"];
    const FB_WRITE = ["uploadBytes", "uploadBytesResumable", "uploadString", "put", "putString",
      "upload", "save", "createWriteStream"];

    const FOREIGN = [/^@aws-sdk\//, /^aws-sdk(\/|$)/, /^@supabase\//, /^cloudinary(\/|$)/,
      /^@vercel\/blob(\/|$)/, /^@google-cloud\/storage(\/|$)/, /^@azure\/storage-/, /^minio$/,
      /^aws-amplify(\/|$)/, /^@aws-amplify\/storage/, /^uploadthing(\/|$)/, /^@uploadthing\//,
      /^multer-s3$/, /^ali-oss$/, /^cos-nodejs-sdk-v5$/, /^backblaze-b2$/, /^imagekit(\/|$)/,
      /^@imagekit\//, /^appwrite$/, /^node-appwrite$/, /^@backblaze/, /^@cloudflare\/r2/];
    const FOREIGN_WRITE = ["upload", "uploadFile", "uploadFiles", "put", "putObject", "fPutObject",
      "upload_stream", "upload_large", "upload_chunked", "uploadStream", "save", "createWriteStream",
      "uploadData", "uploadBlockBlob", "uploadBrowserData", "uploadData", "createFile",
      "uploadToSignedUrl", "multipartUpload", "uploadPart"];
    const FOREIGN_CTOR = ["PutObjectCommand", "Upload", "CreateMultipartUploadCommand",
      "UploadPartCommand", "CompleteMultipartUploadCommand"];

    const isFbDirect = (m) => FB_DIRECT.includes(m);
    const isFbUmbrella = (m) => FB_UMBRELLA.includes(m);
    const isForeign = (m) => FOREIGN.some((r) => r.test(m));

    const where = (n) => sourceFile.getLineAndCharacterOfPosition(n.getStart(sourceFile));

    const importModuleOf = (d) => {
      let p = d;
      while (p && !ts.isImportDeclaration(p) && !ts.isImportEqualsDeclaration(p)) p = p.parent;
      if (!p) return undefined;
      if (ts.isImportDeclaration(p)) {
        return ts.isStringLiteral(p.moduleSpecifier) ? p.moduleSpecifier.text : undefined;
      }
      const r = p.moduleReference;
      if (ts.isExternalModuleReference(r) && ts.isStringLiteral(r.expression)) return r.expression.text;
      return undefined;
    };

    // origin(expr) -> { mod, props } | undefined ; props = property names seen on the path
    const origin = (e, seen, props) => {
      for (let guard = 0; e && guard < 60; guard++) {
        if (ts.isParenthesizedExpression(e) || ts.isNonNullExpression(e) || ts.isAsExpression(e) ||
            ts.isAwaitExpression(e) || (ts.isTypeAssertionExpression && ts.isTypeAssertionExpression(e)) ||
            (ts.isSatisfiesExpression && ts.isSatisfiesExpression(e))) {
          e = e.expression; continue;
        }
        if (ts.isPropertyAccessExpression(e)) { props.push(e.name.text); e = e.expression; continue; }
        if (ts.isElementAccessExpression(e)) {
          if (ts.isStringLiteral(e.argumentExpression)) props.push(e.argumentExpression.text);
          e = e.expression; continue;
        }
        if (ts.isCallExpression(e)) {
          const c = e.expression;
          if (c.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(c) && c.text === "require")) {
            const a = e.arguments[0];
            if (a && ts.isStringLiteralLike(a)) return { mod: a.text, props };
            return undefined;
          }
          e = c; continue;
        }
        if (ts.isIdentifier(e) || e.kind === ts.SyntaxKind.ThisKeyword) {
          if (e.kind === ts.SyntaxKind.ThisKeyword) return undefined;
          const sym = checker.getSymbolAtLocation(e);
          return fromSymbol(sym, seen, props);
        }
        if (ts.isTypeReferenceNode && ts.isTypeReferenceNode(e)) {
          let n = e.typeName;
          while (ts.isQualifiedName(n)) n = n.left;
          return fromSymbol(checker.getSymbolAtLocation(n), seen, props);
        }
        return undefined;
      }
      return undefined;
    };

    const fromDecl = (d, seen, props) => {
      const m = importModuleOf(d);
      if (m !== undefined) return { mod: m, props };
      if (ts.isVariableDeclaration(d) || ts.isPropertyDeclaration(d) || ts.isParameter(d)) {
        if (d.initializer) {
          const r = origin(d.initializer, seen, props);
          if (r) return r;
        }
        if (d.type) return origin(d.type, seen, props);
        return undefined;
      }
      if (ts.isBindingElement(d)) {
        // walk up to the declaration holding the destructured initializer
        let p = d.parent;
        while (p && (ts.isObjectBindingPattern(p) || ts.isArrayBindingPattern(p) || ts.isBindingElement(p))) p = p.parent;
        if (p && (ts.isVariableDeclaration(p) || ts.isParameter(p))) {
          const name = d.propertyName || d.name;
          if (ts.isIdentifier(name) && ts.isObjectBindingPattern(d.parent)) props.push(name.text);
          if (p.initializer) return origin(p.initializer, seen, props);
          if (p.type) return origin(p.type, seen, props);
        }
        return undefined;
      }
      if (ts.isShorthandPropertyAssignment(d)) {
        return fromSymbol(checker.getShorthandAssignmentValueSymbol(d), seen, props);
      }
      return undefined; // functions, classes, methods: local code, analysed on its own
    };

    const fromSymbol = (sym, seen, props) => {
      if (!sym || seen.includes(sym)) return undefined;
      seen.push(sym);
      for (const d of sym.declarations || []) {
        const r = fromDecl(d, seen, props);
        if (r) return r;
      }
      return undefined;
    };

    const classify = (r) => {
      if (!r) return undefined;
      if (isFbDirect(r.mod)) return "firebase";
      if (isFbUmbrella(r.mod)) return r.props.includes("storage") ? "firebase" : undefined;
      if (isForeign(r.mod)) return "foreign";
      return undefined;
    };

    const ev = [];
    let bad = 0;
    const push = (n, kind, ok) => {
      if (!ok) bad += 1;
      const p = where(n);
      ev.push({ line: p.line + 1, column: p.character + 1, node_kind: kind,
        text: n.getText(sourceFile).split("\n")[0].slice(0, 200) });
    };

    const visit = (n) => {
      if (ts.isCallExpression(n)) {
        const callee = n.expression;
        let name;
        if (ts.isIdentifier(callee)) name = callee.text;
        else if (ts.isPropertyAccessExpression(callee)) name = callee.name.text;
        if (name) {
          const cls = classify(origin(callee, [], []));
          if (cls === "firebase" && FB_WRITE.includes(name)) {
            push(n, "CallExpression:firebase-storage-write", true);
          } else if (cls === "foreign" && FOREIGN_WRITE.includes(name)) {
            push(n, "CallExpression:non-firebase-storage-write", false);
          }
        }
      } else if (ts.isNewExpression(n)) {
        const callee = n.expression;
        let name;
        if (ts.isIdentifier(callee)) name = callee.text;
        else if (ts.isPropertyAccessExpression(callee)) name = callee.name.text;
        if (name && FOREIGN_CTOR.includes(name)) {
          const cls = classify(origin(callee, [], []));
          if (cls === "foreign") push(n, "NewExpression:non-firebase-storage-write", false);
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sourceFile);

    if (ev.length === 0) return { outcome: "NOT_APPLICABLE", evidence: [] };
    return { outcome: bad ? "VIOLATED" : "SATISFIED", evidence: ev };
  },
};
