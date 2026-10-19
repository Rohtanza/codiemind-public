const BASE = "https://api.open-meteo.com/v1/forecast";

async function hourlyTemps(latitude, longitude) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    hourly: "temperature_2m",
  });
  const response = await fetch(`${BASE}?${params}`);
  const json = await response.json();
  return json.hourly.temperature_2m;
}

module.exports = { hourlyTemps };
