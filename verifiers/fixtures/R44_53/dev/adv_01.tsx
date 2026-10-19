import { lazy, Suspense as Boundary } from "react";

const InvoiceTable = lazy(() => import("./InvoiceTable"));

export default function BillingPage() {
  return (
    <section>
      <h1>Billing</h1>
      <Boundary fallback={<div>Loading invoices…</div>}>
        <InvoiceTable status="open" />
      </Boundary>
    </section>
  );
}
