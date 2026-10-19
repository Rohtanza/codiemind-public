import { fetchWeatherApi } from "openmeteo";

export async function windSpeeds(latitude: number, longitude: number): Promise<Float32Array | null> {
  const responses = await fetchWeatherApi("https://api.open-meteo.com/v1/forecast", {
    latitude,
    longitude,
    hourly: "wind_speed_10m",
  });
  const hourly = responses[0].hourly();
  return hourly ? hourly.variables(0)!.valuesArray() : null;
}
