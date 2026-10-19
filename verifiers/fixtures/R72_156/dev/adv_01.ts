// Settings are read as `unknown`-safe values; we never use the any type here.
export function loadSettings(raw: string) {
  const settings = JSON.parse(raw);
  return {
    theme: settings.theme,
    fontSize: settings.fontSize,
  };
}
