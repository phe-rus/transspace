import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/(public)/r/healthcare-providers")({
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
