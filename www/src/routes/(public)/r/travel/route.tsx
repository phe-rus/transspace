import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/(public)/r/travel")({
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
