export interface Cat {
  kind: "cat";
  meows: boolean;
}

export function catGuard(animal: { kind: string }): animal is Cat {
  return animal.kind === "cat";
}
