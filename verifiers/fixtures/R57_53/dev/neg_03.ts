'use client';

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function truncate(input: string, max = 80): string {
  return input.length > max ? `${input.slice(0, max - 1)}…` : input;
}
