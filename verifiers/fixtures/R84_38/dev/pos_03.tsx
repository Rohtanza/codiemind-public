import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Dashboard } from "./Dashboard";
import { Settings } from "./Settings";
import { ErrorPage } from "./ErrorPage";

const router = createBrowserRouter([
  { path: "/", element: <Dashboard />, errorElement: <ErrorPage /> },
  { path: "/settings", element: <Settings /> },
]);

export function Root() {
  return <RouterProvider router={router} />;
}
