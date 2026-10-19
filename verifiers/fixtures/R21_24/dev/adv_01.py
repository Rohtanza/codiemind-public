HANDLER_TEMPLATE = '''
def handler(event):
    return event
'''


def render_handler(module_name: str) -> str:
    """Render the source of a generated handler module.

    Args:
        module_name (str): Name of the module to embed in the header.

    Returns:
        str: The full module source code.
    """
    return f"# module: {module_name}\n" + HANDLER_TEMPLATE
