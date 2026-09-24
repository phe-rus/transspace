import { Headers } from '@/components/headers'
import { authGateQueryOptions } from '@/lib/auth-gate'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

// spec 0001 AC-2: "blocks every other page" means every page, not just
// ones under (protection); most of the app's real pages live here in
// (public). Anonymous browsing stays free: the redirect only fires once
// a session actually exists. queryClient.query() populates the query
// cache Headers and any other consumer reads from via useSuspenseQuery,
// so the status is fetched once per navigation, not once per consumer.
export const Route = createFileRoute('/(public)')({
  beforeLoad: async ({ context }) => {
    const status = await context.queryClient.query({
      ...authGateQueryOptions(),
      staleTime: 'static',
    })
    if (status.signedIn) {
      if (status.locked) {
        throw redirect({ to: '/unlock' })
      }
      if (!status.onboarded) {
        throw redirect({ to: '/onboarding' })
      }
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
