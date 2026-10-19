import React from 'react';
import { Button } from '@/components/ui/Button';
import { useCart } from '@/hooks/useCart';
import { formatPrice } from '@/utils/format';

export function CartSummary() {
  const { items, total, checkout } = useCart();
  return (
    <div className="cart-summary">
      <p>{items.length} items</p>
      <p>Total: {formatPrice(total)}</p>
      <Button onClick={checkout}>Checkout</Button>
    </div>
  );
}
