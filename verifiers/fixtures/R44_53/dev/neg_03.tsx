import { lazy, Suspense } from "react";

const Sidebar = lazy(() => import("./Sidebar"));
const Feed = lazy(() => import("./Feed"));

export function Layout() {
  return (
    <div className="layout">
      <Suspense fallback={<aside>Loading…</aside>}>
        <Sidebar />
      </Suspense>
      <Feed />
    </div>
  );
}
