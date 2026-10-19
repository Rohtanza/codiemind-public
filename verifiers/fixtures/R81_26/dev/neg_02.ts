import axios from "axios";

export async function forecast(lat: number, lon: number) {
  const { data } = await axios.get("https://api.weatherapi.com/v1/forecast.json", {
    params: { key: process.env.WEATHERAPI_KEY, q: `${lat},${lon}`, days: 3 },
  });
  return data.forecast.forecastday;
}
