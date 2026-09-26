import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/(public)/stories/$storyId")({
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
