'use client';

interface Product {
  id: string;
  name: string;
  price: number;
}

export default function ProductList({ products }: { products: Product[] }) {
  return (
    <ul>
      {products.map((p) => (
        <li key={p.id}>
          {p.name} — ${p.price.toFixed(2)}
        </li>
      ))}
    </ul>
  );
}
