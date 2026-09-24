import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { authGateQueryOptions } from '@/lib/auth-gate'

// auth aware: a signed in person has no reason to see the sign in
// landing page again. Same gate status other route groups already use,
// so this is a normal continuation of an existing session, not a new
// state to track.
export const Route = createFileRoute('/(authentication)/auth')({
  beforeLoad: async ({ context }) => {
    const status = await context.queryClient.query({
      ...authGateQueryOptions(),
      staleTime: 'static',
    })
    if (!status.signedIn) return
    if (status.locked) {
      throw redirect({ to: '/unlock' })
    }
    if (!status.onboarded) {
      throw redirect({ to: '/onboarding' })
    }
    throw redirect({ to: '/' })
  },
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
