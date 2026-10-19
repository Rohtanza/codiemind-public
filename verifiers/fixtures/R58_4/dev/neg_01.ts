// Fallback colour used when a tag has none assigned.
const color = "#cccccc";

export interface Tag {
  label: string;
  colour?: string;
}

export function tagColour(tag: Tag): string {
  return tag.colour ?? color;
}
