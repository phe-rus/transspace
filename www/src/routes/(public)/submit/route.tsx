import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/(public)/submit")({
  beforeLoad: () => {
    // TODO: redirect to sign-in once authentication & identity (scope.md
    // feature 7) ships — no session state exists yet, so this is a no-op
    // gate for now. The hook point lives here in `route.tsx`, not
    // `index.tsx`, so every guarded page in `(public)` gates the same way.
  },
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
