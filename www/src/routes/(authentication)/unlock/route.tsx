import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/(authentication)/unlock')({
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
