import { useState } from 'react';
import { Modal } from '../components/Modal';
import { useCheckout } from '@/modules/checkout/useCheckout';

export default function CheckoutButton({ cartId }: { cartId: string }) {
  const [open, setOpen] = useState(false);
  const { submit, pending } = useCheckout(cartId);

  return (
    <>
      <button disabled={pending} onClick={() => setOpen(true)}>
        Checkout
      </button>
      {open && <Modal onConfirm={submit} onClose={() => setOpen(false)} />}
    </>
  );
}
