import { lazy, Suspense } from "react";

const RevenueChart = lazy(() => import("./RevenueChart"));

export default function DashboardPage() {
  return (
    <main>
      <h1>Dashboard</h1>
      <Suspense fallback={<div className="skeleton">Loading chart…</div>}>
        <RevenueChart range="30d" />
      </Suspense>
    </main>
  );
}
