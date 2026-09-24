import { Headers } from '@/components/headers'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { getAuthGateStatus } from '@/lib/auth-gate'

// spec 0001 AC-2: "blocks every other page" means every page, not just
// ones under (protection) — most of the app's real pages live here in
// (public). Anonymous browsing stays free: the redirect only fires once
// a session actually exists.
export const Route = createFileRoute('/(public)')({
  beforeLoad: async () => {
    const status = await getAuthGateStatus()
    if (!status.signedIn) return
    if (status.locked) {
      throw redirect({ to: '/unlock' })
    }
    if (!status.onboarded) {
      throw redirect({ to: '/onboarding' })
    }
  },
  component: RouteComponent
})

function RouteComponent() {
  return (
    <div data-posture="expressive">
      <Headers />
      <Outlet />
    </div>
  )
}
