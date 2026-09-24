import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/(public)/r/safe-space")({
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
