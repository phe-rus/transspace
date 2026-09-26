import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { authGateQueryOptions } from "@/lib/auth-gate"

// starting a community thread: signed in only and never indexed (spec 0010
// AC-4, AC-19), the same guard as the communities pages
export const Route = createFileRoute("/(public)/submit-thread")({
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
