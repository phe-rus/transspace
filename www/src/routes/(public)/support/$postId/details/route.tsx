import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/(public)/support/$postId/details")({
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
