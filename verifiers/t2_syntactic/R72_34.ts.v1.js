// R72_34 (T2): "Don't leave blank lines within a function."
// Governed construct: every function-like node with a body (function declaration/expression,
// generator, arrow function — concise or block — method, constructor, getter, setter).
// Bodiless overload/ambient signatures are not instances.
// A block body is VIOLATED if any source line strictly between the line of its opening '{'
// and the line of its closing '}' is whitespace-only, unless that line lies inside a
// string/template literal token (string content) or inside a comment (comment, not blank).
module.exports = {
  tier: "T2",
  verify(ctx) {
    const { ts, sourceFile, text } = ctx;
    const lineStarts = sourceFile.getLineStarts();
    const masked = [];
    const mark = (start, end) => {
      for (let i = 0; i < lineStarts.length; i++) {
        const p = lineStarts[i];
        if (p > start && p < end) masked[i] = true;
      }
    };
    const literalKinds = [
      ts.SyntaxKind.StringLiteral,
      ts.SyntaxKind.NoSubstitutionTemplateLiteral,
      ts.SyntaxKind.TemplateHead,
      ts.SyntaxKind.TemplateMiddle,
      ts.SyntaxKind.TemplateTail,
    ];
    const seenComment = {};
    const markComments = (ranges) => {
      if (!ranges) return;
      for (const r of ranges) {
        const key = r.pos + ":" + r.end;
        if (seenComment[key]) continue;
        seenComment[key] = true;
        mark(r.pos, r.end);
      }
    };
    const fns = [];
    const isFn = (n) =>
      ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isArrowFunction(n) ||
      ts.isMethodDeclaration(n) || ts.isConstructorDeclaration(n) ||
      ts.isGetAccessorDeclaration(n) || ts.isSetAccessorDeclaration(n);
    const walk = (n) => {
      if (isFn(n) && n.body) fns.push(n);
      if (literalKinds.indexOf(n.kind) >= 0) mark(n.getStart(sourceFile), n.end);
      markComments(ts.getLeadingCommentRanges(text, n.pos));
      markComments(ts.getTrailingCommentRanges(text, n.end));
      for (const c of n.getChildren(sourceFile)) walk(c);
    };
    walk(sourceFile);
    if (fns.length === 0) return { outcome: "NOT_APPLICABLE", evidence: [] };
    const lineText = (i) => {
      const s = lineStarts[i];
      const e = i + 1 < lineStarts.length ? lineStarts[i + 1] : text.length;
      return text.slice(s, e);
    };
    const ev = [];
    let bad = 0;
    for (const fn of fns) {
      const start = sourceFile.getLineAndCharacterOfPosition(fn.getStart(sourceFile));
      const head = fn.getText(sourceFile).split("\n")[0];
      const blanks = [];
      if (ts.isBlock(fn.body)) {
        const open = sourceFile.getLineAndCharacterOfPosition(fn.body.getStart(sourceFile)).line;
        const close = sourceFile.getLineAndCharacterOfPosition(fn.body.end - 1).line;
        for (let i = open + 1; i < close; i++) {
          if (!masked[i] && lineText(i).trim() === "") {
            blanks.push(i + 1);
          }
        }
      }
      if (blanks.length) bad += 1;
      ev.push({
        line: blanks.length ? blanks[0] : start.line + 1,
        column: blanks.length ? 1 : start.character + 1,
        node_kind: ts.SyntaxKind[fn.kind],
        text: blanks.length
          ? "blank line(s) " + blanks.join(",") + " in function at line " + (start.line + 1) + ": " + head
          : head,
      });
    }
    return { outcome: bad ? "VIOLATED" : "SATISFIED", evidence: ev };
  },
};
