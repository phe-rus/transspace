import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/(public)/submit-guide")({
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
