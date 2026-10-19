import OpenWeatherAPI from "openweather-api-node";

const weather = new OpenWeatherAPI({
  key: process.env.OWM_KEY,
  locationName: "Lahore",
  units: "metric",
});

export async function currentTemp(): Promise<number> {
  const current = await weather.getCurrent();
  return current.weather.temp.cur;
}
