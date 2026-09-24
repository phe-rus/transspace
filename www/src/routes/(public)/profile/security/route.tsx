import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/(public)/profile/security')({
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
