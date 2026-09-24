import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/(public)/r/$resourceId/details")({
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
