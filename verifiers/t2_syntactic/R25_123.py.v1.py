"""R25_123 (T2): "Use type hints for function parameters and return values".
Governed construct: every FunctionDef / AsyncFunctionDef at any nesting level (lambdas cannot be
annotated and are not instances). Each must carry a return annotation and an annotation on every
parameter (posonly, regular, *args, kw-only, **kwargs). Exemption: the first positional parameter
of a function defined directly in a class body (self/cls), unless decorated @staticmethod.
Annotation content is not judged. Walking the syntax tree ignores defs inside strings/docstrings."""
import ast

TIER = "T2"


def _is_staticmethod(fn):
    for d in fn.decorator_list:
        if isinstance(d, ast.Name) and d.id == "staticmethod":
            return True
        if isinstance(d, ast.Attribute) and d.attr == "staticmethod":
            return True
    return False


def _missing(fn, in_class):
    a = fn.args
    positional = list(a.posonlyargs) + list(a.args)
    missing = []
    skip_first = in_class and not _is_staticmethod(fn)
    for i, p in enumerate(positional):
        if i == 0 and skip_first:
            continue
        if p.annotation is None:
            missing.append(p.arg)
    if a.vararg is not None and a.vararg.annotation is None:
        missing.append("*" + a.vararg.arg)
    for p in a.kwonlyargs:
        if p.annotation is None:
            missing.append(p.arg)
    if a.kwarg is not None and a.kwarg.annotation is None:
        missing.append("**" + a.kwarg.arg)
    if fn.returns is None:
        missing.append("<return>")
    return missing


def verify(ctx):
    tree = ctx["tree"]
    lines = ctx["text"].splitlines()
    ev = []
    bad = 0

    def visit(node, parent_is_class):
        nonlocal bad
        for child in ast.iter_child_nodes(node):
            if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef)):
                miss = _missing(child, parent_is_class)
                ln = child.lineno
                src = lines[ln - 1].strip() if 0 < ln <= len(lines) else child.name
                if miss:
                    bad += 1
                    src = src + "  [missing: " + ", ".join(miss) + "]"
                ev.append({"line": ln, "column": child.col_offset + 1,
                           "node_kind": ("AsyncFunctionDef" if isinstance(child, ast.AsyncFunctionDef)
                                         else "FunctionDef"),
                           "text": src})
                visit(child, False)
            elif isinstance(child, ast.ClassDef):
                visit(child, True)
            else:
                # A def inside an if/try/with block of a class body is still a method of
                # that class (class scope), so class-ness propagates through compound
                # statements; only a function body resets it.
                visit(child, parent_is_class)

    visit(tree, False)
    if not ev:
        return {"outcome": "NOT_APPLICABLE", "evidence": []}
    return {"outcome": "VIOLATED" if bad else "SATISFIED", "evidence": ev}
