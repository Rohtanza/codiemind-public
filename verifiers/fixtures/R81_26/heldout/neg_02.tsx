import { useQuery } from "@tanstack/react-query";

export function useForecast(lat: number, lon: number) {
  return useQuery({
    queryKey: ["forecast", lat, lon],
    queryFn: async () => {
      const r = await fetch(
        `https://api.weatherbit.io/v2.0/forecast/daily?lat=${lat}&lon=${lon}&key=${import.meta.env.VITE_WEATHERBIT_KEY}`
      );
      return r.json();
    },
  });
}
