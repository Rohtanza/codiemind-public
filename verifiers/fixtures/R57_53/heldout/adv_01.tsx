'use client';

type Location = { lat: number; lng: number; label: string };

export function LocationCard({ location }: { location: Location }) {
  const { lat, lng, label } = location;

  return (
    <div className="card">
      <strong>{label}</strong>
      <span>
        {lat.toFixed(4)}, {lng.toFixed(4)}
      </span>
    </div>
  );
}
