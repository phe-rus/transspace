import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/(public)/communities/$slug/threads/$threadId")({
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
