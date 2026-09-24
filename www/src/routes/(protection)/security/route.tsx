import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/(protection)/security')({
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
