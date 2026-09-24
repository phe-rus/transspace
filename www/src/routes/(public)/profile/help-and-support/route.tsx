import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/(public)/profile/help-and-support')({
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
