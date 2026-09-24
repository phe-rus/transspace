import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/(public)/stories")({
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
