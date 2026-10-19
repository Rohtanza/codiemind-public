export async function loadConfig(path: string): Promise<Record<string, unknown>> {
  try {
    const res = await fetch(path);
    if (!res.ok) {
      throw new Error(`Failed to load config: ${res.status}`);
    }
    return (await res.json()) as Record<string, unknown>;
  } catch (err) {
    console.error("Config load failed", err);
    return {};
  }
}
