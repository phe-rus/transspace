import { opportunityCategoryIcon, opportunityCategoryLabel, type OpportunityListing } from "@/data/opportunities"
import { m } from "@/paraglide/messages"
import { CheckmarkCircle01Icon, Globe02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@pherus/ui/button"

export interface OpportunityCardProps {
  opportunity: OpportunityListing
}

export function OpportunityCard({ opportunity }: OpportunityCardProps) {
  return (
    <article className="flex gap-4 rounded-4xl border border-border bg-card p-5 transition-colors hover:bg-muted">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-muted">
        <HugeiconsIcon icon={opportunityCategoryIcon[opportunity.category]} className="size-5" />
      </span>
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h3>{opportunity.title}</h3>
          {opportunity.verified ? (
            <h6 className="flex items-center gap-1">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} className="size-3" />
              {m["pages.opportunities.verified"]()}
            </h6>
          ) : (
            <h6>{m["pages.opportunities.pendingReview"]()}</h6>
          )}
        </div>
        <p>{opportunity.description}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2">
          <p>{opportunity.org}</p>
          <p>·</p>
          <p>{opportunityCategoryLabel[opportunity.category]}</p>
          <p>·</p>
          <p className="flex items-center gap-1">
            {opportunity.remote && <HugeiconsIcon icon={Globe02Icon} className="size-3" />}
            {opportunity.remote ? m["pages.opportunities.remote"]() : opportunity.country}
          </p>
          <p>·</p>
          <p>{m["pages.opportunities.deadlineLabel"]({ deadline: opportunity.deadline })}</p>
        </div>
      </div>
      <Button variant="outline" disabled className="h-9 shrink-0 self-start rounded-full px-4">
        {m["pages.opportunities.view"]()}
      </Button>
    </article>
  )
}
