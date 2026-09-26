import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { amIAdminQueryOptions } from "@/domains/admins"
import { AdminHeader } from "@/components/headers/admin-header"

// the one area that actually lives under (protection): every other
// gated page (including moderation, at /inbox) is just loader
// protected on its own route, the engineer's explicit call
// (2026-09-25). Any admin can get in here; FounderMiddleware gates the
// super admin roster actions specifically inside the page itself.
export const Route = createFileRoute("/(protection)/admin")({
  beforeLoad: async ({ context }) => {
    const status = await context.queryClient.query({
      ...amIAdminQueryOptions(),
      staleTime: "static",
    })
    if (!status.isAdmin) {
      throw redirect({ to: "/" })
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <>
      <AdminHeader />
      <Outlet />
    </>
  )
}
