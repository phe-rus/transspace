import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/(public)/submit-support")({
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
