function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function truncate(input: string, max: number): string {
  return input.length > max ? input.slice(0, max - 1) + "…" : input;
}

export { slugify, truncate };
