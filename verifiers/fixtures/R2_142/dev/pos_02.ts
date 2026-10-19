interface Address {
  street: string;
  city: string;
}

interface Customer {
  id: string;
  address: Address;
}

type CustomerStatus = "active" | "suspended";

export function label(c: Customer, s: CustomerStatus): string {
  return `${c.id} (${s}) - ${c.address.city}`;
}
