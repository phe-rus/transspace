import type { AtlasResource } from "@/data/atlas-resources"
import { resourceCategoryColor, resourceCategoryIcon, resourceCategoryLabel } from "@/data/resource-categories"
import { CheckmarkCircle01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Link } from "@tanstack/react-router"

export interface ResourceCardProps {
  resource: AtlasResource
}

export function ResourceCard({ resource }: ResourceCardProps) {
  return (
    <Link
      to="/r/$resourceId/details"
      params={{ resourceId: resource.id }}
      className="flex gap-4 rounded-4xl border border-border bg-card p-5 transition-colors hover:bg-muted"
    >
      <span
        className="flex size-12 shrink-0 items-center justify-center rounded-2xl"
        style={{ backgroundColor: `${resourceCategoryColor[resource.category]}1a` }}
      >
        <HugeiconsIcon
          icon={resourceCategoryIcon[resource.category]}
          className="size-5"
          style={{ color: resourceCategoryColor[resource.category] }}
        />
      </span>
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h3>{resource.name}</h3>
          {resource.verified ? (
            <h6 className="flex items-center gap-1">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} className="size-3" />
              Community verified
            </h6>
          ) : (
            <h6>Community submitted, awaiting review</h6>
          )}
        </div>
        <p>{resource.description}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2">
          <p>{resourceCategoryLabel[resource.category]}</p>
          <p>·</p>
          <p>{resource.city}, {resource.country}</p>
          <p>·</p>
          <p>{resource.estimate}</p>
        </div>
      </div>
    </Link>
  )
}
