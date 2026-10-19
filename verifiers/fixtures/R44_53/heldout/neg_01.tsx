import { lazy, Suspense } from "react";
import { Title } from "./Title";

const ProductCard = lazy(() => import("./ProductCard"));

export function ProductGrid({ ids }: { ids: string[] }) {
  return (
    <div className="grid">
      <Suspense fallback={<span>…</span>}>
        <Title text="Products" />
      </Suspense>
      {ids.map((id) => (
        <ProductCard key={id} id={id} />
      ))}
    </div>
  );
}
