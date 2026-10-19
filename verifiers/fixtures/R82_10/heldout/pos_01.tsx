import React from "react";

type Props = { loading: boolean; error?: string; items: string[] };

export function ItemList({ loading, error, items }: Props) {
  if (loading) return <p>Loading…</p>;
  if (error) {
    return <p className="error">{error}</p>;
  }
  if (items.length === 0) return null;

  return (
    <ul>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
