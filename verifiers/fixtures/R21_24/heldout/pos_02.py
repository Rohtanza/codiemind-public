from dataclasses import dataclass


@dataclass
class Point:
    """A point in two-dimensional space.

    Attributes:
        x: Horizontal coordinate.
        y: Vertical coordinate.
    """

    x: float
    y: float

    def norm(self) -> float:
        """Compute the distance from the origin.

        Returns:
            float: The Euclidean norm of the point.
        """
        return (self.x ** 2 + self.y ** 2) ** 0.5
