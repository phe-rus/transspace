import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/(public)/communities/$slug")({
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
