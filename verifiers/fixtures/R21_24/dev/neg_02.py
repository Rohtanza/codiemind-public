def slugify(text, separator="-"):
    """Turn a title into a URL slug.

    :param text: The title to convert.
    :param separator: Character placed between words.
    :returns: The slugified string.
    """
    words = text.lower().split()
    return separator.join(words)
