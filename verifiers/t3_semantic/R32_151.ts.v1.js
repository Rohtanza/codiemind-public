// R32_151 (T3): "DTOs should not be modified after creation (Immutable)."
// Governed construct: a class, interface or type alias declared in the unit whose name ends in
// "Dto" or "DTO". An instance conforms when (a) every property of its declared type is readonly
// (readonly modifier, readonly parameter property, getter without setter, Readonly<...> mapping,
// JSDoc @readonly in JS, or Object.freeze(this) in a JS class constructor), and (b) no value of
// that type is modified in the unit. A modification is a property/element write (=, compound,
// ++/--, delete, destructuring target, for-in/of target), Object.assign / defineProperty /
// Reflect.set-style call targeting the value, or a mutating Array/Map/Set method called on a
// field of the value. The receiver chain of a write is inspected: if any receiver has a DTO
// static type, or is an identifier that was assigned a DTO-derived value (an alias, e.g. through
// a widened mutable type, a parameter that receives a DTO argument, or a destructured field), the
// write modifies a DTO. `this` inside a constructor is initialisation, not modification.
// Values are recognised by static type through the checker, never by variable name.
module.exports = {
  tier: "T3",
  verify(ctx) {
    const { ts, sourceFile, checker, program } = ctx;
    const NAME = /(Dto|DTO)$/;
    const ev = [];
    let bad = 0;
    const where = (n) => sourceFile.getLineAndCharacterOfPosition(n.getStart(sourceFile));
    const push = (n, kind, isBad) => {
      if (isBad) bad += 1;
      const p = where(n);
      ev.push({ line: p.line + 1, column: p.character + 1, node_kind: kind,
                text: n.getText(sourceFile).split("\n")[0].slice(0, 200) });
    };

    // ---- 1. collect DTO declarations -------------------------------------------------------
    const decls = [];
    const dtoSyms = new Set();
    const dtoTypes = new Set();
    const collect = (n) => {
      if ((ts.isClassDeclaration(n) || ts.isInterfaceDeclaration(n) || ts.isTypeAliasDeclaration(n))
          && n.name && NAME.test(n.name.text)) {
        const sym = checker.getSymbolAtLocation(n.name);
        if (sym) {
          dtoSyms.add(sym);
          const t = checker.getDeclaredTypeOfSymbol(sym);
          if (t) dtoTypes.add(t);
        }
        decls.push({ node: n, sym });
      }
      ts.forEachChild(n, collect);
    };
    collect(sourceFile);
    if (decls.length === 0) return { outcome: "NOT_APPLICABLE", evidence: [] };

    const WRAPPERS = new Set(["Readonly", "Partial", "Required", "NonNullable"]);
    const isDtoType = (t, depth) => {
      if (!t || depth > 6) return false;
      if (dtoTypes.has(t)) return true;
      if (t.aliasSymbol && dtoSyms.has(t.aliasSymbol)) return true;
      const s = t.getSymbol && t.getSymbol();
      if (s && dtoSyms.has(s)) return true;
      if (t.aliasSymbol && WRAPPERS.has(t.aliasSymbol.getName()) && t.aliasTypeArguments
          && t.aliasTypeArguments.some((a) => isDtoType(a, depth + 1))) return true;
      if (t.flags & (ts.TypeFlags.Union | ts.TypeFlags.Intersection)) {
        return (t.types || []).some((x) => isDtoType(x, depth + 1));
      }
      if (t.flags & ts.TypeFlags.TypeParameter) {
        const c = checker.getBaseConstraintOfType(t);
        if (c && c !== t) return isDtoType(c, depth + 1);
      }
      return false;
    };

    // ---- helpers ------------------------------------------------------------------------------
    const strip = (e) => {
      while (e && (ts.isParenthesizedExpression(e) || ts.isNonNullExpression(e)
             || ts.isAsExpression(e) || ts.isTypeAssertionExpression(e)
             || (ts.isSatisfiesExpression && ts.isSatisfiesExpression(e)))) e = e.expression;
      return e;
    };
    const containerIsCtor = (n) => {
      let p = n.parent;
      while (p) {
        if (ts.isArrowFunction(p)) { p = p.parent; continue; }
        if (ts.isConstructorDeclaration(p)) return true;
        if (ts.isFunctionLike(p) || ts.isClassStaticBlockDeclaration(p) || ts.isPropertyDeclaration(p)
            || ts.isSourceFile(p)) return false;
        p = p.parent;
      }
      return false;
    };
    const enclosingClass = (n) => {
      let p = n.parent;
      while (p) {
        if (ts.isClassLike(p)) return p;
        if (ts.isFunctionLike(p) && !ts.isArrowFunction(p) && !ts.isMethodDeclaration(p)
            && !ts.isConstructorDeclaration(p) && !ts.isAccessor(p)) return undefined;
        p = p.parent;
      }
      return undefined;
    };
    const tainted = new Set();
    const typeOf = (e) => { try { return checker.getTypeAtLocation(e); } catch (_) { return undefined; } };

    // Is a single expression (not its chain) a DTO value?
    const isDtoValue = (e, allowThisCtor) => {
      if (!e) return false;
      if (e.kind === ts.SyntaxKind.ThisKeyword) {
        if (allowThisCtor && containerIsCtor(e)) return false;
        const cls = enclosingClass(e);
        if (cls && cls.name && NAME.test(cls.name.text)) {
          const s = checker.getSymbolAtLocation(cls.name);
          if (s && dtoSyms.has(s)) return true;
        }
        return isDtoType(typeOf(e), 0);
      }
      if (ts.isIdentifier(e)) {
        const s = checker.getSymbolAtLocation(e);
        if (s && tainted.has(s)) return true;
      }
      return isDtoType(typeOf(e), 0);
    };
    // Does the expression, or any receiver along its access chain, denote a DTO value?
    const derived = (e, allowThisCtor) => {
      for (let i = 0; e && i < 32; i++) {
        if (ts.isParenthesizedExpression(e) || ts.isNonNullExpression(e) || ts.isAsExpression(e)
            || ts.isTypeAssertionExpression(e) || (ts.isSatisfiesExpression && ts.isSatisfiesExpression(e))) {
          if (isDtoValue(e, allowThisCtor)) return true;
          e = e.expression; continue;
        }
        if (ts.isConditionalExpression(e)) {
          return derived(e.whenTrue, allowThisCtor) || derived(e.whenFalse, allowThisCtor);
        }
        if (ts.isBinaryExpression(e) && (e.operatorToken.kind === ts.SyntaxKind.BarBarToken
            || e.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
            || e.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken)) {
          return derived(e.left, allowThisCtor) || derived(e.right, allowThisCtor);
        }
        if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
          return derived(e.right, allowThisCtor);
        }
        if (isDtoValue(e, allowThisCtor)) return true;
        if (ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e)) { e = e.expression; continue; }
        return false;
      }
      return false;
    };
    // A write to target `t` (an lvalue) modifies a DTO when a receiver of `t` is DTO-derived.
    const writeHitsDto = (t) => {
      t = strip(t);
      if (!t || !(ts.isPropertyAccessExpression(t) || ts.isElementAccessExpression(t))) return false;
      return derived(t.expression, true);
    };

    // ---- 2. alias / taint propagation (fixpoint) -------------------------------------------------
    const taintSym = (s) => { if (s && !tainted.has(s)) { tainted.add(s); return true; } return false; };
    const taintBinding = (name, fromDto) => {
      let ch = false;
      if (!fromDto) return false;
      if (ts.isIdentifier(name)) ch = taintSym(checker.getSymbolAtLocation(name)) || ch;
      else if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
        for (const el of name.elements) if (ts.isBindingElement(el)) ch = taintBinding(el.name, true) || ch;
      }
      return ch;
    };
    const propagate = (n) => {
      let ch = false;
      if (ts.isVariableDeclaration(n) && n.initializer) {
        ch = taintBinding(n.name, derived(n.initializer, false)) || ch;
      } else if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken
                 && ts.isIdentifier(n.left) && derived(n.right, false)) {
        ch = taintSym(checker.getSymbolAtLocation(n.left)) || ch;
      } else if ((ts.isCallExpression(n) || ts.isNewExpression(n)) && n.arguments && n.arguments.length) {
        let sig;
        try { sig = checker.getResolvedSignature(n); } catch (_) { sig = undefined; }
        const d = sig && sig.declaration;
        if (d && d.parameters && d.getSourceFile && d.getSourceFile() === sourceFile) {
          n.arguments.forEach((a, i) => {
            const prm = d.parameters[Math.min(i, d.parameters.length - 1)];
            if (prm && derived(a, false)) ch = taintBinding(prm.name, true) || ch;
          });
        }
      } else if ((ts.isForOfStatement(n)) && ts.isVariableDeclarationList(n.initializer)) {
        // for (const x of dtoArray) — elements of an array of DTOs are DTO typed already
      }
      let sub = false;
      ts.forEachChild(n, (c) => { if (propagate(c)) sub = true; });
      return ch || sub;
    };
    for (let i = 0; i < 12; i++) if (!propagate(sourceFile)) break;

    // ---- 3. declaration readonly check ------------------------------------------------------------
    const isReadonlyProp = (p) => {
      const cf = (p.links && p.links.checkFlags) || p.checkFlags || 0;
      if (cf & 8) return true; // CheckFlags.Readonly (mapped Readonly<>, synthetic readonly)
      const ds = p.declarations || [];
      if (ds.length === 0) return false;
      if (ds.some((d) => ts.isGetAccessorDeclaration(d)) && !ds.some((d) => ts.isSetAccessorDeclaration(d))) return true;
      return ds.every((d) => {
        let flags = 0;
        try { flags = ts.getCombinedModifierFlags(d); } catch (_) { flags = 0; }
        if (flags & ts.ModifierFlags.Readonly) return true;
        if (ts.getJSDocReadonlyTag && ts.getJSDocReadonlyTag(d)) return true;
        return false;
      });
    };
    const freezesThis = (cls) => {
      if (!ts.isClassDeclaration(cls)) return false;
      let found = false;
      for (const m of cls.members) {
        if (!ts.isConstructorDeclaration(m) || !m.body) continue;
        const v = (n) => {
          if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)
              && ts.isIdentifier(n.expression.expression) && n.expression.expression.text === "Object"
              && n.expression.name.text === "freeze" && n.arguments.length
              && strip(n.arguments[0]).kind === ts.SyntaxKind.ThisKeyword) found = true;
          ts.forEachChild(n, v);
        };
        v(m.body);
      }
      return found;
    };
    for (const { node, sym } of decls) {
      const kindName = ts.SyntaxKind[node.kind];
      if (!sym) { push(node, kindName + ":unresolved", true); continue; }
      const t = checker.getDeclaredTypeOfSymbol(sym);
      const props = checker.getPropertiesOfType(t).filter((p) => !(p.flags & ts.SymbolFlags.Method)
        && !(p.flags & ts.SymbolFlags.Prototype));
      const frozen = freezesThis(node);
      const mutable = frozen ? [] : props.filter((p) => !isReadonlyProp(p));
      const mutIdx = frozen ? [] : checker.getIndexInfosOfType(t).filter((ii) => !ii.isReadonly);
      if (mutable.length || mutIdx.length) {
        const names = mutable.map((p) => p.getName()).concat(mutIdx.length ? ["[index]"] : []);
        push(node, kindName + ":mutable-property(" + names.join(",") + ")", true);
      } else {
        push(node, kindName + ":readonly-declaration", false);
      }
    }

    // ---- 4. modification sites ------------------------------------------------------------------
    const ASSIGN_OPS = new Set([
      ts.SyntaxKind.EqualsToken, ts.SyntaxKind.PlusEqualsToken, ts.SyntaxKind.MinusEqualsToken,
      ts.SyntaxKind.AsteriskEqualsToken, ts.SyntaxKind.AsteriskAsteriskEqualsToken,
      ts.SyntaxKind.SlashEqualsToken, ts.SyntaxKind.PercentEqualsToken,
      ts.SyntaxKind.LessThanLessThanEqualsToken, ts.SyntaxKind.GreaterThanGreaterThanEqualsToken,
      ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken, ts.SyntaxKind.AmpersandEqualsToken,
      ts.SyntaxKind.BarEqualsToken, ts.SyntaxKind.CaretEqualsToken, ts.SyntaxKind.BarBarEqualsToken,
      ts.SyntaxKind.AmpersandAmpersandEqualsToken, ts.SyntaxKind.QuestionQuestionEqualsToken,
    ]);
    const destructTargets = (e, out) => {
      e = strip(e);
      if (!e) return;
      if (ts.isArrayLiteralExpression(e)) e.elements.forEach((x) => destructTargets(x, out));
      else if (ts.isObjectLiteralExpression(e)) {
        for (const p of e.properties) {
          if (ts.isPropertyAssignment(p)) destructTargets(p.initializer, out);
          else if (ts.isSpreadAssignment(p)) destructTargets(p.expression, out);
        }
      } else if (ts.isSpreadElement(e)) destructTargets(e.expression, out);
      else if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.EqualsToken) destructTargets(e.left, out);
      else out.push(e);
    };
    const ARRAY_MUT = new Set(["push", "pop", "shift", "unshift", "splice", "sort", "reverse", "fill", "copyWithin"]);
    const COLL_MUT = new Set(["set", "delete", "clear", "add"]);
    const COLL_TYPES = new Set(["Map", "Set", "WeakMap", "WeakSet"]);
    const isLibGlobal = (id, name) => {
      if (!ts.isIdentifier(id) || id.text !== name) return false;
      const s = checker.getSymbolAtLocation(id);
      return !s || (s.declarations || []).some((d) => program.isSourceFileDefaultLibrary(d.getSourceFile()));
    };
    const visit = (n) => {
      if (ts.isBinaryExpression(n) && ASSIGN_OPS.has(n.operatorToken.kind)) {
        const targets = [];
        if (n.operatorToken.kind === ts.SyntaxKind.EqualsToken) destructTargets(n.left, targets);
        else targets.push(n.left);
        if (targets.some(writeHitsDto)) push(n, "BinaryExpression:dto-write", true);
      } else if ((ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n))
                 && (n.operator === ts.SyntaxKind.PlusPlusToken || n.operator === ts.SyntaxKind.MinusMinusToken)) {
        if (writeHitsDto(n.operand)) push(n, ts.SyntaxKind[n.kind] + ":dto-write", true);
      } else if (ts.isDeleteExpression(n)) {
        if (writeHitsDto(n.expression)) push(n, "DeleteExpression:dto-write", true);
      } else if ((ts.isForOfStatement(n) || ts.isForInStatement(n)) && !ts.isVariableDeclarationList(n.initializer)) {
        const targets = [];
        destructTargets(n.initializer, targets);
        if (targets.some(writeHitsDto)) push(n, ts.SyntaxKind[n.kind] + ":dto-write", true);
      } else if (ts.isCallExpression(n)) {
        const callee = strip(n.expression);
        if (callee && ts.isPropertyAccessExpression(callee)) {
          const obj = strip(callee.expression);
          const m = callee.name.text;
          if ((isLibGlobal(obj, "Object") && ["assign", "defineProperty", "defineProperties", "setPrototypeOf"].includes(m))
              || (isLibGlobal(obj, "Reflect") && ["set", "defineProperty", "deleteProperty", "setPrototypeOf"].includes(m))) {
            if (n.arguments.length && derived(n.arguments[0], true)) push(n, "CallExpression:" + m + "-on-dto", true);
          } else if (ARRAY_MUT.has(m) || COLL_MUT.has(m)) {
            const rt = typeOf(callee.expression);
            let mutRecv = false;
            if (rt) {
              const app = checker.getApparentType(checker.getNonNullableType(rt));
              const isArr = checker.isArrayType(app) || checker.isTupleType(app)
                || (app.flags & ts.TypeFlags.Union && (app.types || []).some((x) => checker.isArrayType(x) || checker.isTupleType(x)));
              const sn = app.getSymbol && app.getSymbol() ? app.getSymbol().getName() : "";
              mutRecv = (ARRAY_MUT.has(m) && isArr) || (COLL_MUT.has(m) && COLL_TYPES.has(sn));
            }
            // the mutated collection must be a field of (or an alias derived from) a DTO value
            const recv = strip(callee.expression);
            const fieldOfDto = recv && ((ts.isPropertyAccessExpression(recv) || ts.isElementAccessExpression(recv))
              ? derived(recv.expression, true)
              : (ts.isIdentifier(recv) && tainted.has(checker.getSymbolAtLocation(recv)) && !isDtoType(rt, 0)));
            if (mutRecv && fieldOfDto) push(n, "CallExpression:mutating-" + m + "-on-dto-field", true);
          }
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sourceFile);

    return { outcome: bad ? "VIOLATED" : "SATISFIED", evidence: ev };
  },
};
