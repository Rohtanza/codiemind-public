from typing import Callable


def make_multiplier(factor: int) -> Callable[[int], int]:
    def multiply(x: int) -> int:
        return x * factor

    return multiply


class MathUtils:
    @staticmethod
    def clamp(value: float, low: float, high: float) -> float:
        return max(low, min(value, high))
