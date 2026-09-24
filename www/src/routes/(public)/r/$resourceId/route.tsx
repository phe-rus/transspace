import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/(public)/r/$resourceId")({
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
