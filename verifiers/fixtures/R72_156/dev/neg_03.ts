export function flatten(items: any[]): string[] {
  const result: string[] = [];
  for (const item of items) {
    if (Array.isArray(item)) {
      result.push(...flatten(item));
    } else {
      result.push(String(item));
    }
  }
  return result;
}
