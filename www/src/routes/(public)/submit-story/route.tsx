import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/(public)/submit-story")({
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
