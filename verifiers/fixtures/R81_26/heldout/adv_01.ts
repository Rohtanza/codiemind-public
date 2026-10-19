const BLOCKED_HOSTS = new Set(["api.openweathermap.org", "api.weatherapi.com"]);

function assertAllowed(url: string): string {
  if (BLOCKED_HOSTS.has(new URL(url).host)) throw new Error(`Provider not allowed: ${url}`);
  return url;
}

export async function precipitation(lat: number, lon: number): Promise<number[]> {
  const url = assertAllowed(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=precipitation`);
  const res = await fetch(url);
  return (await res.json()).hourly.precipitation;
}
