import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/(public)/support/$postId")({
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
