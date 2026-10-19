export function readMessage(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as { text: string };
    return parsed.text;
  } catch ({ message }) {
    return `parse error: ${message}`;
  }
}
