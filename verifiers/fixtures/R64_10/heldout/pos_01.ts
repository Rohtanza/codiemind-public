type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; side: number };

export function isShape(value: unknown): value is Shape {
  return typeof value === "object" && value !== null && "kind" in value;
}

export function area(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "square":
      return shape.side ** 2;
  }
}
