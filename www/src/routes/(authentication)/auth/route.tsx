import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/(authentication)/auth')({
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
