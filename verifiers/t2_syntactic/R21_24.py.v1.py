"""R21_24 (T2): every function, method and class carries a Google-style docstring.

Instances: every FunctionDef / AsyncFunctionDef / ClassDef in the module, at any nesting level
(lambdas excluded; strings and comments are not parsed as code, so look-alikes are ignored).
Class: conforms iff it has a docstring (string literal as first body statement).
Function: conforms iff it has a docstring and
  - if it declares parameters other than a leading self/cls: an 'Args:' section exists and each
    parameter appears in it as an entry 'name:' / 'name (type):' ('*name' / '**name' for
    variadics);
  - if its own body (nested defs/classes/lambdas excluded) yields: a 'Yields:' section exists;
  - else if its own body has 'return <expr>' with expr not the literal None: a 'Returns:'
    section exists.
Sphinx (':param x:') and NumPy ('Parameters' + underline) styles lack these sections and fail.
No instance: NOT_APPLICABLE. Any non-conforming instance: VIOLATED.
"""
import ast
import re

TIER = "T2"

SECTION_RE = re.compile(r"^([ \t]*)([A-Z][A-Za-z ]*):[ \t]*(.*)$")
ENTRY_RE = re.compile(r"^(\*{0,2}[A-Za-z_][A-Za-z0-9_]*)[ \t]*(\([^)]*\))?[ \t]*:")
SCOPE_STOP = (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef, ast.Lambda)


def _docstring(node):
    body = node.body
    if body and isinstance(body[0], ast.Expr):
        v = body[0].value
        if isinstance(v, ast.Constant) and isinstance(v.value, str):
            return v.value
    return None


def _indent(line):
    return len(line) - len(line.lstrip(" \t"))


def _sections(doc):
    """Map section name -> list of body lines (raw). Only Google section header lines count."""
    lines = doc.expandtabs(4).split("\n")
    found = {}
    i = 0
    n = len(lines)
    while i < n:
        m = SECTION_RE.match(lines[i])
        if m and m.group(2) in ("Args", "Returns", "Yields", "Raises", "Attributes",
                                "Example", "Examples", "Note", "Notes", "Todo",
                                "Arguments", "Return", "Yield", "Warning", "Warnings"):
            name = m.group(2)
            hind = len(m.group(1))
            body = []
            inline = m.group(3).strip()
            if inline:
                body.append(inline)
            j = i + 1
            while j < n:
                ln = lines[j]
                if ln.strip() == "":
                    body.append("")
                    j += 1
                    continue
                if _indent(ln) <= hind:
                    break
                body.append(ln)
                j += 1
            found.setdefault(name, body)
            i = j
            continue
        i += 1
    return found


def _arg_entries(body):
    """Entry names at the first indentation level of an Args section body."""
    names = set()
    level = None
    for ln in body:
        if not ln.strip():
            continue
        ind = _indent(ln)
        if level is None:
            level = ind
        if ind != level:
            continue
        m = ENTRY_RE.match(ln.strip())
        if m:
            names.add(m.group(1))
    return names


def _own_nodes(func):
    stack = list(func.body)
    while stack:
        node = stack.pop()
        yield node
        for child in ast.iter_child_nodes(node):
            if isinstance(child, SCOPE_STOP):
                continue
            stack.append(child)


def _params(func):
    a = func.args
    positional = list(a.posonlyargs) + list(a.args)
    names = [x.arg for x in positional]
    if names and names[0] in ("self", "cls"):
        names = names[1:]
    if a.vararg is not None:
        names.append("*" + a.vararg.arg)
    names.extend(x.arg for x in a.kwonlyargs)
    if a.kwarg is not None:
        names.append("**" + a.kwarg.arg)
    return names


def _check_function(func):
    doc = _docstring(func)
    if doc is None:
        return False, "missing docstring"
    secs = _sections(doc)
    params = _params(func)
    if params:
        if "Args" not in secs:
            return False, "no Args: section for parameters " + ", ".join(params)
        entries = _arg_entries(secs["Args"])
        missing = [p for p in params if p not in entries]
        if missing:
            return False, "undocumented parameters " + ", ".join(missing)
    has_yield = False
    has_value_return = False
    for node in _own_nodes(func):
        if isinstance(node, (ast.Yield, ast.YieldFrom)):
            has_yield = True
        elif isinstance(node, ast.Return) and node.value is not None:
            v = node.value
            if not (isinstance(v, ast.Constant) and v.value is None):
                has_value_return = True
    if has_yield:
        if "Yields" not in secs:
            return False, "generator without Yields: section"
    elif has_value_return and "Returns" not in secs:
        return False, "returns a value without Returns: section"
    return True, "Google-style docstring conforms"


def verify(ctx):
    tree = ctx["tree"]
    evidence = []
    violated = False
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            ok = _docstring(node) is not None
            why = "class docstring present" if ok else "class missing docstring"
            kind = "ClassDef"
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            ok, why = _check_function(node)
            kind = "AsyncFunctionDef" if isinstance(node, ast.AsyncFunctionDef) else "FunctionDef"
        else:
            continue
        if not ok:
            violated = True
        evidence.append({"line": node.lineno, "column": node.col_offset + 1, "node_kind": kind,
                         "text": node.name + ": " + ("SATISFIED " if ok else "VIOLATED ") + why})
    if not evidence:
        return {"outcome": "NOT_APPLICABLE", "evidence": []}
    evidence.sort(key=lambda e: (e["line"], e["column"]))
    return {"outcome": "VIOLATED" if violated else "SATISFIED", "evidence": evidence}
