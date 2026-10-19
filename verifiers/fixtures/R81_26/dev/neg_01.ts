const API_KEY = process.env.OWM_API_KEY;

export async function getTemperature(city: string): Promise<number> {
  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`
  );
  const body = await res.json();
  return body.main.temp;
}
