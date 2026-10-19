export async function loadConfig(path: string): Promise<Record<string, unknown>> {
  try {
    const res = await fetch(path);
    return (await res.json()) as Record<string, unknown>;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(`Failed to load config: ${error.message}`);
    }
    return {};
  }
}
