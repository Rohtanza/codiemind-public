def load_text(path, encoding="utf-8"):
    """Load a text file into a string.

    Args:
        path (str): Path to the file.

    Returns:
        str: The file contents.
    """
    with open(path, encoding=encoding) as handle:
        return handle.read()
