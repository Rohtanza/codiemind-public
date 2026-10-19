export type Direction = "up" | "down" | "left" | "right";

export function opposite(d: Direction): Direction {
  switch (d) {
    case "up": return "down";
    case "down": return "up";
    case "left": return "right";
    default: return "left";
  }
}
