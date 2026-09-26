import { JoinControl, LiveRoom, ThreadRow } from "@/components/communities"
import {
  THREAD_TYPES,
  communityIcon,
  communityLabel,
  isCommunitySlug,
  threadTypeLabel,
} from "@/data/communities"
import { listCommunitiesQueryOptions, listThreadsQueryOptions } from "@/domains/guides"
import { m } from "@/paraglide/messages"
import { Add01Icon, ArrowLeft01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@pherus/ui/button"
import { cn } from "@pherus/ui/lib/utils"
import { Tabs, TabsList, TabsTrigger } from "@pherus/ui/tabs"
import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { Link, createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

export const Route = createFileRoute("/(public)/communities/$slug/")({
  validateSearch: z.object({
    tab: z.enum(["threads", "live"]).optional(),
    type: z.enum(THREAD_TYPES).optional(),
  }),
  loaderDeps: ({ search }) => ({ type: search.type }),
  loader: ({ context, params, deps }) =>
    isCommunitySlug(params.slug)
      ? context.queryClient.prefetchInfiniteQuery(
          listThreadsQueryOptions(params.slug, deps.type)
        )
      : undefined,
  component: RouteComponent,
})

function RouteComponent() {
  const { slug } = Route.useParams()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const tab = search.tab ?? "threads"
  const known = isCommunitySlug(slug)

  const threadsQuery = useInfiniteQuery({
    ...listThreadsQueryOptions(slug, search.type),
    enabled: known && tab === "threads",
  })
  const threads = threadsQuery.data?.pages.flatMap((page) => page.items) ?? []
  // whether this person joined it, from the same list /communities uses
  const { data: communities } = useQuery(listCommunitiesQueryOptions())
  const joined = communities?.find((community) => community.slug === slug)?.joined

  const patchSearch = (patch: Partial<typeof search>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true })

  if (!known) {
    return (
      <article className="container mx-auto flex min-h-[50vh] w-full flex-col items-center justify-center gap-3 py-10 text-center md:max-w-3xl">
        <h1>{m["pages.communities.communityNotFound"]()}</h1>
        <Button variant="outline" nativeButton={false} render={<Link to="/communities" />} className="rounded-full">
          {m["pages.communities.backToCommunities"]()}
        </Button>
      </article>
    )
  }

  return (
    <article className="container mx-auto flex w-full flex-col gap-6 py-10 md:max-w-3xl">
      <Link to="/communities" className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground">
        <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3.5" />
        {m["pages.communities.backToCommunities"]()}
      </Link>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted">
            <HugeiconsIcon icon={communityIcon[slug]} className="size-5" />
          </span>
          <h1>{communityLabel(slug)}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
        {joined !== undefined && <JoinControl slug={slug} joined={joined} />}
        <Button
          variant="secondary"
          nativeButton={false}
          render={<Link to="/submit-thread" search={{ community: slug }} />}
          className="h-11 w-fit shrink-0 gap-1.5 rounded-full px-5"
        >
          <HugeiconsIcon icon={Add01Icon} />
          {m["pages.communities.startThread"]()}
        </Button>
        </div>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) =>
          patchSearch({ tab: value === "live" ? "live" : undefined })
        }
      >
        <TabsList variant="line" className="w-fit gap-4 px-0">
          <TabsTrigger value="threads" className="px-0">
            {m["pages.communities.tabThreads"]()}
          </TabsTrigger>
          <TabsTrigger value="live" className="px-0">
            {m["pages.communities.tabLive"]()}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "live" ? (
        <LiveRoom slug={slug} />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-1.5">
            {[undefined, ...THREAD_TYPES].map((type) => (
              <button
                key={type ?? "all"}
                type="button"
                aria-pressed={search.type === type}
                onClick={() => patchSearch({ type })}
                className={cn(
                  "rounded-full border px-3.5 py-2 text-sm transition-colors",
                  search.type === type
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:border-muted-foreground",
                )}
              >
                {type ? threadTypeLabel(type) : m["pages.communities.allTypes"]()}
              </button>
            ))}
          </div>

          <ul className="flex list-none flex-col ps-0 *:ps-0">
            {threads.map((thread) => (
              <li key={thread.id}>
                <ThreadRow thread={thread} />
              </li>
            ))}
          </ul>

          {threadsQuery.isSuccess && threads.length === 0 && (
            <p className="py-10 text-center">
              {search.type
                ? m["pages.communities.noThreadsOfType"]()
                : m["pages.communities.noThreads"]()}
            </p>
          )}

          {threadsQuery.hasNextPage && (
            <Button
              variant="outline"
              disabled={threadsQuery.isFetchingNextPage}
              onClick={() => threadsQuery.fetchNextPage()}
              className="w-fit self-center rounded-full"
            >
              {m["pages.communities.loadMore"]()}
            </Button>
          )}
        </div>
      )}
    </article>
  )
}
