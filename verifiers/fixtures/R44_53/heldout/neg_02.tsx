import { Suspense } from "react";
import dynamic from "next/dynamic";

const CheckoutWidget = dynamic(() => import("@/components/checkout-widget"));

export default function CartPage() {
  return (
    <main>
      <Suspense fallback={null}>
        <CheckoutWidget currency="USD" />
      </Suspense>
    </main>
  );
}
