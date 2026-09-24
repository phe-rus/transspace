import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { getAuthGateStatus } from '@/lib/auth-gate'

// the real session guard (spec 0001 Build plan step 4, AC-1, AC-2): no
// session -> /auth; signed in but locked -> /unlock; signed in but not
// yet onboarded -> /onboarding; only then does anything under
// (protection) render.
export const Route = createFileRoute('/(protection)')({
  beforeLoad: async () => {
    const status = await getAuthGateStatus()
    if (!status.signedIn) {
      throw redirect({ to: '/auth' })
    }
    if (status.locked) {
      throw redirect({ to: '/unlock' })
    }
    if (!status.onboarded) {
      throw redirect({ to: '/onboarding' })
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div data-posture="dense">
      <Outlet />
    </div>
  )
}
