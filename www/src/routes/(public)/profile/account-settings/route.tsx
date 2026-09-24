import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/(public)/profile/account-settings')({
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
