import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/(public)/r/mental-health")({
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
