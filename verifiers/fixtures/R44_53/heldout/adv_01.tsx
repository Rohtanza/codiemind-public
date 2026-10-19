import { lazy, type ReactNode } from "react";

const AnalyticsPanel = lazy(() => import("./AnalyticsPanel"));

function Suspense({ children }: { children: ReactNode; fallback?: ReactNode }) {
  return <div className="panel-shell">{children}</div>;
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<p>Loading analytics…</p>}>
      <AnalyticsPanel />
    </Suspense>
  );
}
