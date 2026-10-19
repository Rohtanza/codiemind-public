import axios from "axios";

const GEOCODING = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST = "https://api.open-meteo.com/v1/forecast";

export async function dailyMaxForCity(city: string): Promise<number[]> {
  const geo = await axios.get(GEOCODING, { params: { name: city, count: 1 } });
  const { latitude, longitude } = geo.data.results[0];
  const fc = await axios.get(FORECAST, {
    params: { latitude, longitude, daily: "temperature_2m_max", timezone: "auto" },
  });
  return fc.data.daily.temperature_2m_max;
}
