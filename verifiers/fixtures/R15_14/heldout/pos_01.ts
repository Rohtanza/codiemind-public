export function* chunkLines(rawText: string, chunkSize: number) {
  let buffer: string[] = [];
  for (const line of rawText.split("\n")) {
    buffer.push(line);
    if (buffer.length === chunkSize) {
      yield buffer;
      buffer = [];
    }
  }
  if (buffer.length > 0) yield buffer;
}

export function safeParse(jsonText: string): unknown {
  try {
    return JSON.parse(jsonText);
  } catch (parseError) {
    return null;
  }
}
