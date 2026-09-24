import { OpportunityCard } from "@/components/opportunities/opportunity-card"
import {
  OPPORTUNITY_CATEGORIES,
  opportunities,
  opportunityCategoryIcon,
  opportunityCategoryLabel,
  type OpportunityCategory,
} from "@/data/opportunities"
import { Add01Icon, SearchIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@pherus/ui/button"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@pherus/ui/input-group"
import { cn } from "@pherus/ui/lib/utils"
import { createFileRoute } from "@tanstack/react-router"
import { useMemo, useState } from "react"

export const Route = createFileRoute("/(public)/opportunities/")({
  component: RouteComponent,
})

function RouteComponent() {
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState<OpportunityCategory | null>(null)
  const [remoteOnly, setRemoteOnly] = useState(false)
  const [verifiedOnly, setVerifiedOnly] = useState(false)

  const filteredOpportunities = useMemo(() => {
    const query = search.trim().toLowerCase()
    return opportunities.filter((item) => {
      const matchesCategory = !activeCategory || item.category === activeCategory
      const matchesSearch =
        !query ||
        item.title.toLowerCase().includes(query) ||
        item.org.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      const matchesRemote = !remoteOnly || item.remote
      const matchesVerified = !verifiedOnly || item.verified
      return matchesCategory && matchesSearch && matchesRemote && matchesVerified
    })
  }, [search, activeCategory, remoteOnly, verifiedOnly])

  return (
    <article className="container mx-auto flex w-full flex-col gap-6 py-10 md:max-w-5xl">
      <div className="flex flex-col gap-2">
        <h1>Jobs & careers</h1>
        <p className="max-w-lg">
          Jobs, freelance work, scholarships, mentorship, and volunteering shared by the community and allies.
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
              placeholder='Search opportunities, e.g. "remote design job"'
            />
          </InputGroup>
          <Button disabled className="h-11 shrink-0 gap-1.5 rounded-full px-5">
            <HugeiconsIcon icon={Add01Icon} />
            Post an opportunity
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={cn(
              "rounded-full border px-3.5 py-2 text-sm transition-colors",
              activeCategory === null
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-muted-foreground",
            )}
          >
            All
          </button>
          {OPPORTUNITY_CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory((current) => (current === category ? null : category))}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors",
                activeCategory === category
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:border-muted-foreground",
              )}
            >
              <HugeiconsIcon icon={opportunityCategoryIcon[category]} className="size-3.5" />
              {opportunityCategoryLabel[category]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        <div className="flex flex-2 flex-col gap-3.5">
          <p>{filteredOpportunities.length} opportunities</p>

          {filteredOpportunities.map((item) => (
            <OpportunityCard key={item.id} opportunity={item} />
          ))}

          {filteredOpportunities.length === 0 && (
            <div className="flex min-h-16 items-center justify-center rounded-4xl border border-dashed border-border p-5 text-center">
              <p>No matches. Try a different search, or clear a filter.</p>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-4 md:sticky md:top-11 md:self-start">
          <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-5">
            <h6>Refine</h6>
            <label className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={remoteOnly}
                onChange={(event) => setRemoteOnly(event.target.checked)}
                className="accent-success"
              />
              Remote only
            </label>
            <label className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(event) => setVerifiedOnly(event.target.checked)}
                className="accent-success"
              />
              Community verified only
            </label>
          </div>

          <div className="flex flex-col gap-2 rounded-3xl border border-border bg-card p-5">
            <h6>Before you apply</h6>
            <p>Deciding when to come out at work</p>
            <p>Rebuilding a resume after a gap</p>
          </div>
        </div>
      </div>
    </article>
  )
}
