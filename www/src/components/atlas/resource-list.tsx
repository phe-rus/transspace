import type { AtlasResource } from "@/data/atlas-resources"
import { m } from "@/paraglide/messages"
import { resourceCategoryColor } from "@/data/resource-categories"
import { useMap } from "@pherus/ui/map"
import { cn } from "@pherus/ui/lib/utils"

export interface AtlasResourceListProps {
  resources: AtlasResource[]
  selectedId: string | null
  onSelect: (resource: AtlasResource) => void
}

/**
 * Lives inside <Map> (not the route component) purely so it can call
 * useMap() and fly to a resource on click; the filtering logic itself
 * stays in the route.
 */
export function AtlasResourceList({ resources, selectedId, onSelect }: AtlasResourceListProps) {
  const { map } = useMap()

  return (
    <div className="no-scrollbar pointer-events-auto flex max-h-[46vh] w-full max-w-sm flex-col gap-1 overflow-y-auto rounded-3xl border border-border/35 bg-card/80 p-2 shadow-lg backdrop-blur">
      {resources.length === 0 && <p className="p-3 text-center">{m["components.atlasList.noMatches"]()}</p>}
      {resources.map((resource) => (
        <button
          key={resource.id}
          type="button"
          onClick={() => {
            map?.flyTo({ center: resource.position, zoom: 10 })
            onSelect(resource)
          }}
          className={cn(
            "flex items-center gap-2.5 rounded-xl p-2.5 text-left transition-colors hover:bg-muted",
            selectedId === resource.id && "bg-muted",
          )}
        >
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: resourceCategoryColor[resource.category] }}
          />
          <span className="min-w-0 flex-1">
            <strong className="block truncate">{resource.name}</strong>
            <p className="truncate">
              {resource.city}, {resource.country} · {resource.estimate}
            </p>
          </span>
        </button>
      ))}
    </div>
  )
}
