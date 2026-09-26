import { countryName } from "@/data/countries"
import { m } from "@/paraglide/messages"
import { getLocale } from "@/paraglide/runtime"
import { Briefcase02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Badge } from "@pherus/ui/badge"
import { Button } from "@pherus/ui/button"
import { Link } from "@tanstack/react-router"
import type { JobListing } from "./job-listing"

function modeLabel(listing: JobListing): string | null {
  if (listing.mode === "remote") return m["pages.opportunities.remote"]()
  if (listing.mode === "hybrid") {
    return m["pages.submitSupport.fields.remoteOrLocalOptions.hybrid"]()
  }
  if (listing.mode === "local") {
    return listing.countryCode
      ? countryName(listing.countryCode, getLocale())
      : m["pages.submitSupport.fields.remoteOrLocalOptions.local"]()
  }
  return null
}

export function OpportunityCard({ listing }: { listing: JobListing }) {
  const facts = [listing.role, listing.compensation, modeLabel(listing)].filter(
    (fact): fact is string => Boolean(fact)
  )

  return (
    <article className="flex gap-4 rounded-4xl border border-border bg-card p-5 transition-colors hover:bg-muted">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-muted">
        <HugeiconsIcon icon={Briefcase02Icon} className="size-5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3>{listing.title}</h3>
            {listing.urgent && (
              <Badge variant="destructive">
                {m["components.supportPostCard.urgent"]()}
              </Badge>
            )}
          </div>
          {listing.org && <p>{listing.org}</p>}
        </div>
        {facts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {facts.map((fact) => (
              <Badge
                key={fact}
                variant="outline"
                className="h-auto px-2.5 py-1 text-xs"
              >
                {fact}
              </Badge>
            ))}
          </div>
        )}
        {listing.summary && <p className="line-clamp-2">{listing.summary}</p>}
      </div>
      <Button
        variant="outline"
        nativeButton={false}
        render={<Link to="/support/$postId/details" params={{ postId: listing.id }} />}
        className="h-9 shrink-0 self-start rounded-full px-4"
      >
        {m["pages.opportunities.view"]()}
      </Button>
    </article>
  )
}
