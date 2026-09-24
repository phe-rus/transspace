import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/(authentication)/onboarding')({
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
