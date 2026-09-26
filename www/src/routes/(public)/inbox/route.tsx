import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { amIModeratorQueryOptions } from "@/domains/moderators"

// the inbox is the moderators' review inbox, so it carries its own
// beforeLoad guard (same shape as profile/route.tsx) instead of living under
// the heavier (protection) tree, which only /admin uses
export const Route = createFileRoute("/(public)/inbox")({
  beforeLoad: async ({ context }) => {
    const status = await context.queryClient.query({
      ...amIModeratorQueryOptions(),
      staleTime: "static",
    })
    if (!status.isModerator) {
      throw redirect({ to: "/profile" })
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
