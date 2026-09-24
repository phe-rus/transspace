import type { listResources } from "@/domains/resources"
import { m } from "@/paraglide/messages"
import {
  resourceCategoryColor,
  resourceCategoryIcon,
  resourceCategoryLabel,
  type ResourceCategory,
} from "@/data/resource-categories"
import { CheckmarkCircle01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Link } from "@tanstack/react-router"

export type PublicResourceListItem = Awaited<
  ReturnType<typeof listResources>
>["items"][number]

export interface ResourceCardProps {
  resource: PublicResourceListItem
}

export function ResourceCard({ resource }: ResourceCardProps) {
  // category is validated against RESOURCE_CATEGORIES at submission
  // time (spec 0003 AC-7); the DB column itself is plain text, so this
  // cast just recovers the narrow type the color/icon/label maps need
  const category = resource.category as ResourceCategory

  return (
    <Link
      to="/r/$resourceId/details"
      params={{ resourceId: resource.id }}
      className="flex gap-4 rounded-4xl border border-border bg-card p-5 transition-colors hover:bg-muted"
    >
      <span
        className="flex size-12 shrink-0 items-center justify-center rounded-2xl"
        style={{ backgroundColor: `${resourceCategoryColor[category]}1a` }}
      >
        <HugeiconsIcon
          icon={resourceCategoryIcon[category]}
          className="size-5"
          style={{ color: resourceCategoryColor[category] }}
        />
      </span>
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h3>{resource.name}</h3>
          {resource.professionalVerified ? (
            <h6 className="flex items-center gap-1">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} className="size-3" />
              {m["components.resourceCard.verified"]()}
            </h6>
          ) : (
            <h6>{m["components.resourceCard.pendingReview"]()}</h6>
          )}
        </div>
        <p>{resource.description}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2">
          <p>{resourceCategoryLabel[category]}</p>
          <p>·</p>
          <p>{resource.city}, {resource.countryName}</p>
          <p>·</p>
          <p>{resource.estimate}</p>
        </div>
      </div>
    </Link>
  )
}
