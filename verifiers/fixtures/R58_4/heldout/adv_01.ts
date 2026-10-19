interface Office {
  city: string;
  honorific: string;
  colour: string;
}

export const offices: Office[] = [
  { city: "Denver, Colorado", honorific: "Dr", colour: "#8e44ad" },
  { city: "Leeds", honorific: "Ms", colour: "#27ae60" },
];

export function officeLabel(office: Office): string {
  return `${office.honorific} at ${office.city} (${office.colour})`;
}
