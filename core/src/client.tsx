
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { createRoot } from "react-dom/client"
import { RouteSpec } from "./types";

export function startClient(routes: RouteSpec[]) {
  const rootElement = document.getElementById('root')!;
  const root = createRoot(rootElement);
  const router = createBrowserRouter(routes.map(({ path, render }) => ({
    path,
    element: render(),
  })));
  root.render(
    <RouterProvider router={router} />
  );
}

