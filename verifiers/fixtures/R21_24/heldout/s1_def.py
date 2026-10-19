"""Code templates for generated handlers."""

TEMPLATE = """
def handler(event):
    return event
"""


def render() -> str:
    """Return the handler template.

    Returns:
        The template source text.
    """
    return TEMPLATE
