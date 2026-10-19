const TOMORROW_URL = "https://api.tomorrow.io/v4/weather/realtime";
const METEO_URL = "https://api.open-meteo.com/v1/forecast";

async function realtime(location) {
  const res = await fetch(`${TOMORROW_URL}?location=${location}&apikey=${process.env.TOMORROW_KEY}`);
  return res.json();
}

async function fallback(lat, lon) {
  const res = await fetch(`${METEO_URL}?latitude=${lat}&longitude=${lon}&current_weather=true`);
  return res.json();
}

module.exports = { realtime, fallback };
