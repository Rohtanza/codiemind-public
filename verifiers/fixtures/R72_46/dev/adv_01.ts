const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isLowercase(s: string): boolean {
  return s === s.toLowerCase();
}

// Validates a URL slug, e.g. used by the router before lookup.
export function validSlug(s: string) {
  return SLUG_PATTERN.test(s);
}
