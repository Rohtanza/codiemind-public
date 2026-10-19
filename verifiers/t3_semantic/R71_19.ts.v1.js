// R71_19 (T3): "Use lucide-react for icons." Governed construct: a VALUE reference to a binding
// imported (import / import-equals / require / dynamic import) from an icon package. Whether an
// identifier is such a reference needs binding resolution: the checker maps each identifier to
// its symbol, which is compared to the symbols the icon imports declare, so aliases, namespace
// imports and shorthand properties resolve correctly and unrelated identifiers with the same
// name do not. A binding referenced only in type positions (e.g. react-icons' IconType) is not
// an icon. Comments and strings are never instances. Icon values from lucide-react conform;
// icon values from any other icon library violate.
module.exports = {
  tier: "T3",
  verify(ctx) {
    const { ts, sourceFile, checker } = ctx;
    const OTHER = [
      /^react-icons(\/|$)/, /^@heroicons\//, /^heroicons(\/|$)/, /^@fortawesome\//,
      /^@mui\/icons-material(\/|$)/, /^@material-ui\/icons(\/|$)/, /^@tabler\/icons/,
      /^phosphor-react(\/|$)/, /^@phosphor-icons\//, /^react-feather(\/|$)/, /^feather-icons(\/|$)/,
      /^@radix-ui\/react-icons(\/|$)/, /^@iconify\//, /^@iconify-icons\//, /^react-bootstrap-icons(\/|$)/,
      /^@ant-design\/icons(\/|$)/, /^@primer\/octicons-react(\/|$)/, /^@carbon\/icons-react(\/|$)/,
      /^@remixicon\//, /^remixicon-react(\/|$)/, /^@hugeicons\//, /^@mdi\/(js|react)(\/|$)/,
      /^@expo\/vector-icons(\/|$)/, /^react-native-vector-icons(\/|$)/, /^ionicons(\/|$)/,
      /^react-ionicons(\/|$)/, /^@ionic\/icons/, /^boxicons(\/|$)/, /^@icons-pack\//,
      /^@iconscout\//, /^@geist-ui\/icons(\/|$)/, /^@chakra-ui\/icons(\/|$)/, /^@blueprintjs\/icons(\/|$)/,
      /^@fluentui\/react-icons(\/|$)/, /^grommet-icons(\/|$)/, /^react-icomoon(\/|$)/, /^iconoir-react(\/|$)/,
      /^@atlaskit\/icon(\/|$)/, /^@svgr\//, /^lucide(\/|$)/, /^lucide-(?!react$|react\/)/,
    ];
    const classify = (spec) => {
      if (spec === "lucide-react" || spec.indexOf("lucide-react/") === 0) return "lucide";
      return OTHER.some((r) => r.test(spec)) ? "other" : null;
    };
    const where = (n) => sourceFile.getLineAndCharacterOfPosition(n.getStart(sourceFile));
    const ev = [];
    let bad = 0;
    const record = (node, lib, kind) => {
      const p = where(node);
      if (lib === "other") bad += 1;
      ev.push({ line: p.line + 1, column: p.character + 1,
        node_kind: kind + (lib === "lucide" ? ":lucide-react" : ":other-icon-library"),
        text: node.getText(sourceFile).split("\n")[0] });
    };

    // symbol -> library; declaration-name nodes to skip; top-level names for local re-exports
    const bound = new Map();
    const declNodes = new Set();
    const byName = new Map();
    const bind = (nameNode, lib) => {
      declNodes.add(nameNode);
      const sym = checker.getSymbolAtLocation(nameNode);
      if (sym) bound.set(sym, lib);
      byName.set(nameNode.text, lib);
    };
    const bindPattern = (name, lib) => {
      if (ts.isIdentifier(name)) bind(name, lib);
      else if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
        name.elements.forEach((el) => { if (ts.isBindingElement(el)) bindPattern(el.name, lib); });
      }
    };
    const moduleCallSpec = (call) => {
      if (!ts.isCallExpression(call) || call.arguments.length < 1) return null;
      const a = call.arguments[0];
      if (!ts.isStringLiteralLike(a)) return null;
      const isReq = ts.isIdentifier(call.expression) && call.expression.text === "require";
      const isDyn = call.expression.kind === ts.SyntaxKind.ImportKeyword;
      return isReq || isDyn ? a.text : null;
    };
    const unwrap = (e) => {
      for (;;) {
        if (ts.isParenthesizedExpression(e) || ts.isAwaitExpression(e) || ts.isAsExpression(e) ||
            ts.isNonNullExpression(e)) e = e.expression;
        else if (ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e)) e = e.expression;
        else return e;
      }
    };
    const boundCalls = new Set();

    // Pass 1: collect icon bindings.
    const collect = (n) => {
      if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier) && n.importClause) {
        const lib = classify(n.moduleSpecifier.text);
        const ic = n.importClause;
        if (lib && !ic.isTypeOnly) {
          if (ic.name) bind(ic.name, lib);
          const nb = ic.namedBindings;
          if (nb && ts.isNamespaceImport(nb)) bind(nb.name, lib);
          if (nb && ts.isNamedImports(nb)) nb.elements.forEach((s) => { if (!s.isTypeOnly) bind(s.name, lib); });
        }
      } else if (ts.isImportEqualsDeclaration(n) && !n.isTypeOnly &&
                 ts.isExternalModuleReference(n.moduleReference) &&
                 ts.isStringLiteral(n.moduleReference.expression)) {
        const lib = classify(n.moduleReference.expression.text);
        if (lib) bind(n.name, lib);
      } else if (ts.isVariableDeclaration(n) && n.initializer) {
        const root = unwrap(n.initializer);
        const spec = moduleCallSpec(root);
        const lib = spec && classify(spec);
        if (lib) { boundCalls.add(root); bindPattern(n.name, lib); }
      }
      ts.forEachChild(n, collect);
    };
    collect(sourceFile);

    const inTypePosition = (id) => {
      let c = id;
      for (let p = id.parent; p; c = p, p = p.parent) {
        if (ts.isExpressionWithTypeArguments(p)) {
          const h = p.parent;
          if (h && ts.isHeritageClause(h) && h.token === ts.SyntaxKind.ExtendsKeyword &&
              h.parent && (ts.isClassDeclaration(h.parent) || ts.isClassExpression(h.parent)) &&
              c === p.expression) return false;
          return true;
        }
        if (ts.isTypeNode(p)) return true;
        if (ts.isStatement(p) || ts.isSourceFile(p)) return false;
      }
      return false;
    };

    // Pass 2: value references to icon bindings, unbound module calls, re-exports.
    const visit = (n) => {
      if (ts.isIdentifier(n) && !declNodes.has(n)) {
        const par = n.parent;
        let sym;
        let local = true;
        if (par && ts.isShorthandPropertyAssignment(par) && par.name === n) {
          sym = checker.getShorthandAssignmentValueSymbol(par);
        } else if (par && ts.isJsxClosingElement(par)) {
          local = false;
        } else if (par && ts.isExportSpecifier(par)) {
          local = false;
          const ed = par.parent && par.parent.parent;
          const localName = par.propertyName || par.name;
          if (n === localName && ed && !ed.moduleSpecifier && !ed.isTypeOnly && !par.isTypeOnly &&
              ts.isIdentifier(localName) && byName.has(localName.text)) {
            record(n, byName.get(localName.text), "ExportSpecifier");
          }
        } else if (par && (ts.isPropertyAccessExpression(par) || ts.isQualifiedName(par)) &&
                   (par.name === n || par.right === n)) {
          local = false;
        } else {
          sym = checker.getSymbolAtLocation(n);
        }
        if (local && sym && bound.has(sym) && !inTypePosition(n)) {
          record(n, bound.get(sym), par && ts.isJsxOpeningLikeElement(par) ? "JsxElement" : "Identifier");
        }
      } else if (ts.isCallExpression(n) && !boundCalls.has(n)) {
        const spec = moduleCallSpec(n);
        const lib = spec && classify(spec);
        if (lib) record(n, lib, "CallExpression:module-load");
      } else if (ts.isExportDeclaration(n) && !n.isTypeOnly && n.moduleSpecifier &&
                 ts.isStringLiteral(n.moduleSpecifier)) {
        const lib = classify(n.moduleSpecifier.text);
        const allType = n.exportClause && ts.isNamedExports(n.exportClause) &&
          n.exportClause.elements.length > 0 && n.exportClause.elements.every((e) => e.isTypeOnly);
        if (lib && !allType) record(n, lib, "ExportDeclaration:re-export");
      }
      ts.forEachChild(n, visit);
    };
    visit(sourceFile);

    if (ev.length === 0) return { outcome: "NOT_APPLICABLE", evidence: [] };
    return { outcome: bad ? "VIOLATED" : "SATISFIED", evidence: ev };
  },
};
