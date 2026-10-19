def read_chunks(path, size=1024):
    """Read a file lazily in fixed-size chunks.

    Args:
        path (str): Path to the file.
        size (int): Number of bytes per chunk.

    Yields:
        bytes: The next chunk of the file.
    """
    with open(path, "rb") as handle:
        while chunk := handle.read(size):
            yield chunk


def print_banner():
    """Print the application banner to stdout."""
    print("=== Chunk Reader ===")
