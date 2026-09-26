import { OpportunityCard } from "@/components/opportunities/opportunity-card"
import { toJobListing } from "@/components/opportunities/job-listing"
import { listSupportPostsQueryOptions } from "@/domains/support"
import { m } from "@/paraglide/messages"
import { Add01Icon, SearchIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@pherus/ui/button"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@pherus/ui/input-group"
import { Skeleton } from "@pherus/ui/skeleton"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useMemo, useState } from "react"

export const Route = createFileRoute("/(public)/opportunities/")({
  component: RouteComponent,
})

function RouteComponent() {
  const [search, setSearch] = useState("")
  const [remoteOnly, setRemoteOnly] = useState(false)

  // jobs and careers are the published offer_job posts from mutual aid
  const jobsQuery = useQuery(
    listSupportPostsQueryOptions({ type: "offer_job", limit: 50 })
  )

  const filteredOpportunities = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (jobsQuery.data?.items ?? [])
      .map(toJobListing)
      .filter((item) => {
        const matchesSearch =
          !query ||
          [item.title, item.org, item.role, item.summary]
            .join(" ")
            .toLowerCase()
            .includes(query)
        const matchesRemote = !remoteOnly || item.mode === "remote"
        return matchesSearch && matchesRemote
      })
  }, [jobsQuery.data, search, remoteOnly])

  return (
    <article className="container mx-auto flex w-full flex-col gap-6 py-10 md:max-w-5xl">
      <div className="flex flex-col gap-2">
        <h1>{m["pages.opportunities.title"]()}</h1>
        <p className="max-w-lg">
          {m["pages.opportunities.subtitle"]()}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <InputGroup className="h-11 flex-1 rounded-full">
            <InputGroupAddon align="inline-start">
              <HugeiconsIcon icon={SearchIcon} className="size-4" />
            </InputGroupAddon>
            <InputGroupInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={m["pages.opportunities.searchPlaceholder"]()}
            />
          </InputGroup>
          <Button
            nativeButton={false}
            render={<Link to="/submit-support" />}
            className="h-11 shrink-0 gap-1.5 rounded-full px-5"
          >
            <HugeiconsIcon icon={Add01Icon} />
            {m["pages.opportunities.post"]()}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-8 md:flex-row md:gap-10">
        <div className="flex flex-2 flex-col">
          <p className="pb-3">{m["pages.opportunities.countLabel"]({ count: filteredOpportunities.length })}</p>

          {jobsQuery.isPending &&
            Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="my-3 h-28 rounded-2xl" />
            ))}

          {filteredOpportunities.map((item) => (
            <OpportunityCard key={item.id} listing={item} />
          ))}

          {jobsQuery.isSuccess && filteredOpportunities.length === 0 && (
            <p className="border-t border-border/60 py-10 text-center">
              {m["pages.opportunities.noMatches"]()}
            </p>
          )}
        </div>

        <aside className="flex flex-1 flex-col gap-8 border-t border-border/60 pt-6 md:sticky md:top-11 md:self-start md:border-t-0 md:border-l md:pt-0 md:pl-8">
          <div className="flex flex-col gap-3">
            <h6>{m["pages.opportunities.refine"]()}</h6>
            <label className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={remoteOnly}
                onChange={(event) => setRemoteOnly(event.target.checked)}
                className="accent-success"
              />
              {m["pages.opportunities.remoteOnly"]()}
            </label>
          </div>

          <div className="flex flex-col gap-2">
            <h6>{m["pages.opportunities.beforeYouApply"]()}</h6>
            <p>Deciding when to come out at work</p>
            <p>Rebuilding a resume after a gap</p>
          </div>
        </aside>
      </div>
    </article>
  )
}
