import { createRootRoute, createRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { Home } from "./Home";

const rootRoute = createRootRoute();
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Home,
});

const router = createRouter({ routeTree: rootRoute.addChildren([indexRoute]) });

export function App() {
  return <RouterProvider router={router} />;
}
