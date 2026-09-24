import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/(authentication)/reset-lock')({
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
