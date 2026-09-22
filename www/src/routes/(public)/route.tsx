import { Footers } from '@/components/footers'
import { Headers } from '@/components/headers'
import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/(public)')({
  component: RouteComponent
})

function RouteComponent() {
  return (
    <div data-posture="expressive">
      <Headers />
      <Outlet />
      <Footers />
    </div>
  )
}
