import { useEffect, useState } from 'react';
import type { Product } from 'src/types/product';
import { fetchProducts } from 'src/api/products';

export function useProducts() {
  const [items, setItems] = useState<Product[]>([]);
  useEffect(() => {
    fetchProducts().then(setItems);
  }, []);
  return items;
}
