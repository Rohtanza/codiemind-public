const LEGACY_PROVIDER = "https://api.openweathermap.org/data/2.5/weather";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

export async function getWeather(lat: number, lon: number) {
  console.info(`Weather provider migrated from ${LEGACY_PROVIDER} to Open-Meteo`);
  const res = await fetch(`${FORECAST_URL}?latitude=${lat}&longitude=${lon}&current_weather=true`);
  return (await res.json()).current_weather;
}
