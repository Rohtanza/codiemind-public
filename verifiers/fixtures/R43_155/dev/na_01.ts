export function fetchItems(url: string): Promise<string[]> {
  return fetch(url)
    .then((res) => res.json())
    .catch((err) => {
      console.error(err);
      return [];
    });
}

export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}
