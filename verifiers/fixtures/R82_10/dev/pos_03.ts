type Row = { name: string; score: number | null };

export function topNames(rows: Row[], min: number): string[] {
  const result: string[] = [];
  for (const row of rows) {
    if (row.score === null) continue;
    if (row.score < min) continue;
    result.push(row.name.trim());
  }
  return result;
}
