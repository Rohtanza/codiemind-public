interface Point {
  x: number;
  y: number;
}

interface Circle {
  center: Point;
  radius: number;
}

export function area(c: Circle): number {
  return Math.PI * c.radius ** 2;
}
