type Parsed = ReturnType<typeof JSON.parse>;

export function parseMessage(raw: string): Parsed {
  return JSON.parse(raw);
}

export function topic(raw: string): string {
  const msg = parseMessage(raw);
  return String(msg.topic);
}
