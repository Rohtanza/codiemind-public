export interface CurrentWeather {
  temperature: number;
  windspeed: number;
}

export async function getCurrentWeather(lat: number, lon: number): Promise<CurrentWeather> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather request failed: ${res.status}`);
  const data = await res.json();
  return data.current_weather as CurrentWeather;
}
