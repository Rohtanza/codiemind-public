interface Settings {
  theme: "light" | "dark";
  fontSize: number;
}

export function loadSettings(raw: string): Settings {
  const parsed = JSON.parse(raw) as any;
  return { theme: parsed.theme, fontSize: Number(parsed.fontSize) };
}
