def is_even(number: int) -> bool:
    """Check whether a number is even.

    Args:
        number (int): The number to check.

    Returns:
        bool: True if the number is even.
    """
    return number % 2 == 0


def clamp(value: int, low: int, high: int) -> int:
    """Clamp a value into the inclusive range [low, high].

    Args:
        value (int): The value to clamp.
        low (int): Lower bound.
        high (int): Upper bound.
    """
    return max(low, min(value, high))
