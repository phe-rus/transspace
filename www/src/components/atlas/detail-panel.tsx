import type { AtlasResource } from "@/data/atlas-resources"
import type { AtlasZone } from "@/data/atlas-zones"
import { m } from "@/paraglide/messages"
import { resourceCategoryColor, resourceCategoryIcon, resourceCategoryLabel } from "@/data/resource-categories"
import { ArrowLeft01Icon, CheckmarkCircle01Icon, SquareLock02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@pherus/ui/button"
import { cn } from "@pherus/ui/lib/utils"

export type AtlasSelection = { kind: "resource"; data: AtlasResource } | { kind: "zone"; data: AtlasZone }

export interface AtlasDetailPanelProps {
  selection: AtlasSelection
  onBack: () => void
}

function Header({ category, name, onBack }: { category: keyof typeof resourceCategoryColor; name: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <Button size="icon-sm" variant="ghost" aria-label={m["components.atlasDetail.backToList"]()} onClick={onBack}>
        <HugeiconsIcon icon={ArrowLeft01Icon} />
      </Button>
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${resourceCategoryColor[category]}22` }}>
        <HugeiconsIcon icon={resourceCategoryIcon[category]} className="size-3.5" style={{ color: resourceCategoryColor[category] }} />
      </span>
      <h3 className="flex-1 truncate">{name}</h3>
    </div>
  )
}

export function AtlasDetailPanel({ selection, onBack }: AtlasDetailPanelProps) {
  if (selection.kind === "resource") {
    const resource = selection.data
    return (
      <article className="no-scrollbar flex max-h-[46vh] w-full max-w-sm flex-col gap-3 overflow-y-auto rounded-3xl border border-border/35 bg-card/80 p-4 shadow-lg backdrop-blur">
        <Header category={resource.category} name={resource.name} onBack={onBack} />
        <p>{resource.city}, {resource.country}</p>
        <h6>{resourceCategoryLabel[resource.category]}</h6>
        <p className="text-foreground">{resource.estimate}</p>
        {resource.contact && <p>{resource.contact}</p>}
        <div className="flex flex-wrap gap-3">
          {resource.verified && (
            <h6 className="flex items-center gap-1.5">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} className="size-3.5" />
              {m["components.atlasDetail.verified"]()}
            </h6>
          )}
          {resource.internationalAccess && <h6>{m["components.atlasDetail.internationalAccess"]()}</h6>}
        </div>
      </article>
    )
  }

  const zone = selection.data
  return (
    <article className="no-scrollbar flex max-h-[46vh] w-full max-w-sm flex-col gap-3 overflow-y-auto rounded-3xl border border-border/35 bg-card/80 p-4 shadow-lg backdrop-blur">
      <Header category={zone.category} name={zone.name} onBack={onBack} />
      <p>{zone.country} · {resourceCategoryLabel[zone.category]}</p>
      <p>{zone.summary}</p>

      {(zone.items || zone.contact) && (
        <div className="relative flex flex-col gap-1.5">
          <div className={cn("flex flex-col gap-1.5", zone.gated && "pointer-events-none blur-xs select-none")}>
            {zone.items?.map((item) => (
              <div key={item.name} className="flex items-center justify-between rounded-xl border border-border p-2.5">
                <strong>{item.name}</strong>
                <p className="text-foreground">{item.estimate}</p>
              </div>
            ))}
            {zone.contact && (
              <div className="rounded-xl border border-border p-2.5">
                <h6>{m["components.atlasDetail.contact"]()}</h6>
                <p>{zone.contact}</p>
              </div>
            )}
          </div>
          {zone.gated && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-card/70">
              <HugeiconsIcon icon={SquareLock02Icon} className="size-4" />
              <Button size="sm" disabled className="rounded-full">
                {m["components.atlasDetail.signInToUnlock"]()}
              </Button>
            </div>
          )}
        </div>
      )}

      {zone.safetyNote && (
        <div className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 p-2.5">
          <HugeiconsIcon icon={SquareLock02Icon} className="mt-0.5 size-3.5 shrink-0 text-warning" />
          <p>{zone.safetyNote}</p>
        </div>
      )}
    </article>
  )
}
