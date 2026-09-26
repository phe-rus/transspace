import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { authGateQueryOptions } from "@/lib/auth-gate"

// communities are for signed in people only, and never indexed (spec 0010
// AC-1, AC-19). The guard and the robots tag live here once, so every page
// below (a community, a thread) inherits both
export const Route = createFileRoute("/(public)/communities")({
  beforeLoad: async ({ context }) => {
    const status = await context.queryClient.query({
      ...authGateQueryOptions(),
      staleTime: "static",
    })
    if (!status.signedIn) {
      throw redirect({ to: "/auth" })
    }
    if (status.locked) {
      throw redirect({ to: "/unlock" })
    }
    if (!status.onboarded) {
      throw redirect({ to: "/onboarding" })
    }
  },
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
