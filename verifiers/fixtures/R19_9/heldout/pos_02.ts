type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rect"; width: number; height: number };

const message: string = "never fall back to any here";

export function area(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "rect":
      return shape.width * shape.height;
  }
}

export function describe(shape: Shape): string {
  return `${shape.kind}: ${area(shape).toFixed(2)} (${message})`;
}
