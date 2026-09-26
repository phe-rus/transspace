import { CommunityRow, JoinedCommunitiesStrip, LiveRoomsStrip } from "@/components/communities"
import { listCommunitiesQueryOptions } from "@/domains/guides"
import { m } from "@/paraglide/messages"
import { Add01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@pherus/ui/button"
import { useSuspenseQuery } from "@tanstack/react-query"
import { Link, createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/(public)/communities/")({
  loader: ({ context }) =>
    context.queryClient.query({
      ...listCommunitiesQueryOptions(),
      staleTime: "static",
    }),
  component: RouteComponent,
})

function RouteComponent() {
  // live counts change while the page is open, so they refresh every 30s
  const { data: communities } = useSuspenseQuery({
    ...listCommunitiesQueryOptions(),
    refetchInterval: 30_000,
  })
  // joined first as circles, then the rest as rows, each already in the
  // fixed order (AC-1)
  const joined = communities.filter((community) => community.joined)
  const others = communities.filter((community) => !community.joined)

  return (
    <article className="container mx-auto flex w-full flex-col gap-8 py-10 md:max-w-3xl">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <h1>{m["pages.communities.title"]()}</h1>
          <p className="max-w-lg">{m["pages.communities.subtitle"]()}</p>
        </div>
        <Button
          variant="secondary"
          nativeButton={false}
          render={<Link to="/submit-thread" />}
          className="h-11 w-fit shrink-0 gap-1.5 rounded-full px-5"
        >
          <HugeiconsIcon icon={Add01Icon} />
          {m["pages.communities.startThread"]()}
        </Button>
      </div>

      <LiveRoomsStrip rooms={communities} />

      <JoinedCommunitiesStrip communities={joined} />

      {others.length > 0 && (
        <section className="flex flex-col gap-1">
          <h6>{m["pages.communities.more"]()}</h6>
          <ul className="flex list-none flex-col ps-0 *:ps-0">
            {others.map((community) => (
              <CommunityRow
                key={community.slug}
                slug={community.slug}
                joined={community.joined}
                lastActivityAt={community.lastActivityAt}
                liveCount={community.liveCount}
              />
            ))}
          </ul>
        </section>
      )}
    </article>
  )
}
