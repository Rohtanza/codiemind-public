import React from "react";
import dynamic from "next/dynamic";
import { Spinner } from "@/components/ui/spinner";

const MapView = dynamic(() => import("@/components/map-view"), { ssr: false });

export default function StoreLocator() {
  return (
    <section>
      <React.Suspense fallback={<Spinner size="lg" />}>
        <MapView center={[51.5, -0.12]} zoom={11} />
      </React.Suspense>
    </section>
  );
}
