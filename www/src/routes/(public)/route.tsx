import { Headers } from '@/components/headers'
import { getAuthGateStatus } from '@/lib/auth-gate'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/(public)')({
  beforeLoad: async () => {
    const status = await getAuthGateStatus()
    if (status.signedIn) {
      if (status.locked) {
        throw redirect({ to: '/unlock' })
      }
      if (!status.onboarded) {
        throw redirect({ to: '/onboarding' })
      }
    }
    return { signedIn: status.signedIn }
  },
  component: RouteComponent
})

function RouteComponent() {
  const { signedIn } = Route.useRouteContext()
  return (
    <div data-posture="expressive">
      <Headers signedIn={signedIn} />
      <Outlet />
    </div>
  )
}
