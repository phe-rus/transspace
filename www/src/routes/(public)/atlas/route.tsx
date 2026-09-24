import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/(public)/atlas")({
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
