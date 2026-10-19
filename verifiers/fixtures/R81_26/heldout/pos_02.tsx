import { useEffect, useState } from "react";

export function TemperatureBadge({ lat, lon }: { lat: number; lon: number }) {
  const [temp, setTemp] = useState<number | null>(null);
  useEffect(() => {
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m`)
      .then((r) => r.json())
      .then((d) => setTemp(d.current.temperature_2m));
  }, [lat, lon]);
  return <span>{temp === null ? "…" : `${temp}°C`}</span>;
}
