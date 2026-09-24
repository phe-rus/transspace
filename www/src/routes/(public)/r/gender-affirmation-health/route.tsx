import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/(public)/r/gender-affirmation-health")({
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
