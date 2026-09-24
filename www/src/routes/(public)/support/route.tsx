import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/(public)/support")({
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
