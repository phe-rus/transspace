import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/(public)/guides/$guideId")({
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
