export interface TimeEntry { start: Date; end: Date; tag: string }

export function distributeByHour(entries: TimeEntry[]): number[] {
  const minutes = new Array<number>(24).fill(0);
  for (const e of entries) {
    const cursor = new Date(e.start);
    while (cursor < e.end) {
      minutes[cursor.getHours()] += 1;
      cursor.setMinutes(cursor.getMinutes() + 1);
    }
  }
  return minutes;
}
