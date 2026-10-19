type Settings = { theme: "light" | "dark"; fontSize: number };

export async function loadSettings(path: string): Promise<Settings> {
  const res = await fetch(path);
  const parsed: Settings = await res.json();
  return parsed;
}

export function mergeSettings(base: Settings, patch: Partial<Settings>): Settings {
  return { ...base, ...(patch as Record<string, any>) };
}
