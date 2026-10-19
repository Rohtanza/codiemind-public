// Theme helpers: each swatch stores a colour as a hex string.
export interface Swatch {
  name: string;
  colour: string;
}

export function setColour(swatch: Swatch, colour: string): Swatch {
  return { ...swatch, colour };
}

export const defaultColours: Swatch[] = [
  { name: "primary", colour: "#1a73e8" },
  { name: "accent", colour: "#fbbc04" },
];
