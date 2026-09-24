import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { authGateQueryOptions } from "@/lib/auth-gate"

// /profile stays under (public) (most pages here allow anonymous
// browsing), but this one specific page needs its own guard: viewing
// your own account makes no sense without a session, so it redirects
// the same way (protection) does rather than moving the whole page there.
export const Route = createFileRoute("/(public)/profile")({
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
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
