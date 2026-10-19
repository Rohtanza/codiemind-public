// R72_41 (T2): "Start each function with a verb."
// Governed construct: every NAMED function in the unit, read off the syntax tree:
//   - FunctionDeclaration with a name (async / generator / overload / ambient included)
//   - FunctionExpression or ArrowFunction initialising a const/let/var identifier binding
//   - class MethodDeclaration, and a class PropertyDeclaration whose initialiser is a function
//   - object-literal MethodDeclaration, and PropertyAssignment whose value is a function
// Excluded: constructors, get/set accessors, anonymous callbacks, computed names, and anything
// inside comments or string/template literals (they are not nodes of the tree).
// Conformance: the name is split at its first word boundary (case change, underscore, digit,
// '$'); the first word, lower-cased, must be in a fixed verb lexicon. Exact word match, so
// "getter", "issue", "settings" are not verb-initial.
const VERBS = new Set((
  "get set is has have can should does do needs need " +
  "fetch load save store create make build construct compose generate produce " +
  "compute calculate calc count sum measure estimate evaluate eval " +
  "validate verify check test assert ensure expect confirm require " +
  "render draw paint display show hide toggle open close mount unmount " +
  "handle process dispatch emit trigger fire notify publish subscribe unsubscribe " +
  "listen watch observe on off " +
  "add append prepend insert push pop shift unshift remove delete del drop clear reset " +
  "purge prune trim strip truncate pad " +
  "update upsert patch modify change edit alter replace swap " +
  "apply run exec execute invoke call perform do start stop pause resume restart " +
  "begin end finish complete abort cancel retry repeat skip wait await " +
  "send post put receive request respond reply submit upload download " +
  "parse format serialize deserialize stringify encode decode encrypt decrypt " +
  "hash sign compress decompress escape unescape sanitize normalize " +
  "convert transform translate map reduce filter sort group partition " +
  "split join merge combine concat flatten zip chunk slice splice " +
  "find search lookup locate query select pick choose match scan seek " +
  "read write print log trace warn debug report track " +
  "stream pipe flush " +
  "init initialize initialise setup configure register unregister bind unbind " +
  "attach detach connect disconnect link unlink " +
  "use wrap unwrap extract inject resolve reject " +
  "copy clone duplicate move mutate shuffle reverse rotate scale resize " +
  "fill format round floor ceil clamp limit throttle debounce memoize cache " +
  "go navigate redirect route goto " +
  "login logout signin signout signup authenticate authorize " +
  "allow deny grant revoke block unblock enable disable activate deactivate " +
  "lock unlock " +
  "mark unmark flag rename " +
  "list enumerate iterate loop walk visit traverse collect gather " +
  "compare diff equals contains include includes exclude " +
  "expand collapse extend inherit override " +
  "listen poll ping sync refresh reload rerender revalidate invalidate " +
  "import export install uninstall deploy release migrate seed " +
  "schedule queue enqueue dequeue " +
  "assign allocate dispose destroy kill terminate shutdown teardown " +
  "keep hold release take give put let make " +
  "try catch throw raise " +
  "describe explain summarize summarise " +
  "focus blur click press tap scroll drag hover " +
  "play animate fade slide " +
  "prepare preload prefetch precompute " +
  "derive infer guess predict detect identify recognize classify " +
  "accept approve decline " +
  "await bootstrap boot spawn fork " +
  "increment decrement inc dec incr decr " +
  "capitalize uppercase lowercase camelize slugify pluralize " +
  "split tokenize lex compile transpile bundle minify lint " +
  "persist restore recover backup archive " +
  "emit broadcast forward relay proxy " +
  "benchmark " +
  "attempt"
).split(/\s+/).filter((w) => w.length > 0));

const firstWord = (name) => {
  const s = name.replace(/^[_$#]+/, "");
  if (!s) return "";
  // ALL_CAPS / snake_case: split at underscore or digit.
  const m = /^([A-Z]+(?![a-z])|[A-Z]?[a-z]+|[0-9]+)/.exec(s);
  return m ? m[1].toLowerCase() : "";
};

module.exports = {
  tier: "T2",
  verify(ctx) {
    const { ts, sourceFile } = ctx;
    const ev = [];
    let bad = 0;
    const unwrap = (e) => {
      let x = e;
      while (x && (ts.isParenthesizedExpression(x) || ts.isAsExpression(x) ||
             ts.isTypeAssertionExpression(x) || ts.isNonNullExpression(x) ||
             (ts.isSatisfiesExpression && ts.isSatisfiesExpression(x)))) x = x.expression;
      return x;
    };
    const isFn = (e) => {
      const x = unwrap(e);
      return !!x && (ts.isArrowFunction(x) || ts.isFunctionExpression(x));
    };
    const nameOf = (nameNode) => {
      if (!nameNode) return null;
      if (ts.isIdentifier(nameNode) || ts.isPrivateIdentifier(nameNode)) return nameNode.text;
      if (ts.isStringLiteral(nameNode) || ts.isNoSubstitutionTemplateLiteral(nameNode)) {
        return nameNode.text;
      }
      return null; // computed / numeric names carry no word
    };
    const record = (node, name) => {
      const word = firstWord(name);
      const ok = VERBS.has(word);
      if (!ok) bad += 1;
      const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      ev.push({ line: pos.line + 1, column: pos.character + 1,
                node_kind: ts.SyntaxKind[node.kind],
                text: `${name} -> first word "${word}" ${ok ? "is" : "is not"} a verb` });
    };
    const visit = (n) => {
      if (ts.isFunctionDeclaration(n) && n.name) {
        record(n, n.name.text);
      } else if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && isFn(n.initializer)) {
        record(n, n.name.text);
      } else if (ts.isMethodDeclaration(n)) {
        const nm = nameOf(n.name);
        if (nm !== null) record(n, nm);
      } else if (ts.isPropertyDeclaration(n) && isFn(n.initializer)) {
        const nm = nameOf(n.name);
        if (nm !== null) record(n, nm);
      } else if (ts.isPropertyAssignment(n) && isFn(n.initializer)) {
        const nm = nameOf(n.name);
        if (nm !== null) record(n, nm);
      }
      ts.forEachChild(n, visit);
    };
    visit(sourceFile);
    if (ev.length === 0) return { outcome: "NOT_APPLICABLE", evidence: [] };
    return { outcome: bad ? "VIOLATED" : "SATISFIED", evidence: ev };
  },
};
