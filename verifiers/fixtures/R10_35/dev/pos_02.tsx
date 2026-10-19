import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@/shared/format';
import { ProductCard } from './ProductCard';

export function ProductList({ categoryId }: { categoryId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['products', categoryId],
    queryFn: () => fetch(`/api/products?c=${categoryId}`).then((r) => r.json()),
  });

  if (isLoading) return <p>Loading...</p>;

  return (
    <ul>
      {data.map((p: { id: string; name: string; price: number }) => (
        <ProductCard key={p.id} name={p.name} price={formatCurrency(p.price)} />
      ))}
    </ul>
  );
}
