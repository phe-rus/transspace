import { AtlasAreaZone } from "@/components/atlas/area-zone"
import { AtlasAutoRotate } from "@/components/atlas/auto-rotate"
import { AtlasCountryZone } from "@/components/atlas/country-zone"
import { AtlasDetailPanel, type AtlasSelection } from "@/components/atlas/detail-panel"
import { AtlasFlaggedBorders } from "@/components/atlas/flagged-borders"
import { AtlasResourceList } from "@/components/atlas/resource-list"
import { atlasResources } from "@/data/atlas-resources"
import { atlasZones } from "@/data/atlas-zones"
import {
  RESOURCE_CATEGORIES,
  resourceCategoryColor,
  resourceCategoryLabel,
  type ResourceCategory,
  type ResourceProperties,
} from "@/data/resource-categories"
import { FilterHorizontalIcon, SearchIcon, Shield01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@pherus/ui/input-group"
import { cn } from "@pherus/ui/lib/utils"
import { Map, MapClusterLayer, MapControls } from "@pherus/ui/map"
import { createFileRoute } from "@tanstack/react-router"
import { useMemo, useState } from "react"

export const Route = createFileRoute("/(public)/atlas")({
  component: RouteComponent,
})

function RouteComponent() {
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState<ResourceCategory | null>(null)
  const [selected, setSelected] = useState<AtlasSelection | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(true)

  const flaggedCountryNames = atlasZones
    .filter((zone) => zone.category === "crisis")
    .map((zone) => zone.country)

  // Country zones render first, area zones last: DOM order is paint order,
  // so the more specific (and geographically smaller) area zone always
  // wins a click where the two overlap, like Wandegeya inside Uganda.
  const countryZones = atlasZones.filter((zone) => zone.scope === "country")
  const areaZones = atlasZones.filter((zone) => zone.scope === "area")

  const filteredResources = useMemo(() => {
    const query = search.trim().toLowerCase()
    return atlasResources.filter((resource) => {
      const matchesCategory = !activeCategory || resource.category === activeCategory
      const matchesSearch =
        !query ||
        resource.name.toLowerCase().includes(query) ||
        resource.city.toLowerCase().includes(query) ||
        resource.country.toLowerCase().includes(query)
      return matchesCategory && matchesSearch
    })
  }, [search, activeCategory])

  const resourceFeatures = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: filteredResources.map((resource) => ({
        type: "Feature" as const,
        properties: resource as unknown as GeoJSON.GeoJsonProperties,
        geometry: { type: "Point" as const, coordinates: resource.position },
      })),
    }),
    [filteredResources],
  )

  return (
    <div className="relative -mt-11 h-svh w-full overflow-hidden">
      <Map
        center={[20, 25]}
        zoom={1.6}
        projection={{ type: "globe" }}
        className="absolute inset-0"
      >
        <AtlasAutoRotate />
        <AtlasFlaggedBorders countryNames={flaggedCountryNames} />
        <MapClusterLayer
          data={resourceFeatures}
          pointColor="#3b82f6"
          onPointClick={(feature) => {
            const properties = feature.properties as unknown as ResourceProperties
            const resource = atlasResources.find((item) => item.id === properties.id)
            if (resource) setSelected({ kind: "resource", data: resource })
          }}
        />

        {countryZones.map((zone) => (
          <AtlasCountryZone key={zone.id} zone={zone} onSelect={(picked) => setSelected({ kind: "zone", data: picked })} />
        ))}
        {areaZones.map((zone) => (
          <AtlasAreaZone key={zone.id} zone={zone} onSelect={(picked) => setSelected({ kind: "zone", data: picked })} />
        ))}

        {/* bottom-20, not the component's default bottom-10: the global
            language switcher is fixed at right:20px/bottom:20px on every
            page, and would otherwise sit directly on top of these. */}
        <MapControls
          showZoom
          showCompass
          showLocate
          showFullscreen
          className="right-5 bottom-20"
        />

        {/* bottom-10, not bottom-5: the map's own attribution toggle sits at
            the literal bottom-left corner and was getting covered. */}
        <div className="absolute bottom-10 left-5 flex flex-col gap-3">
          {selected ? (
            <AtlasDetailPanel selection={selected} onBack={() => setSelected(null)} />
          ) : (
            <AtlasResourceList
              resources={filteredResources}
              selectedId={null}
              onSelect={(resource) => setSelected({ kind: "resource", data: resource })}
            />
          )}
        </div>
      </Map>

      <div className="pointer-events-none absolute inset-x-0 top-12 flex flex-col items-center gap-2.5 px-5">
        <InputGroup className="pointer-events-auto h-11 w-full max-w-md rounded-full bg-card px-1.5 shadow">
          <InputGroupAddon align="inline-start">
            <HugeiconsIcon icon={SearchIcon} className="size-4" />
          </InputGroupAddon>
          <InputGroupInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search resources, cities, or countries…"
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              size="icon-sm"
              variant={filtersOpen ? "secondary" : "ghost"}
              aria-label="Toggle category filters"
              aria-pressed={filtersOpen}
              onClick={() => setFiltersOpen((open) => !open)}
            >
              <HugeiconsIcon icon={FilterHorizontalIcon} className="size-4" />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>

        {filtersOpen && (
          <div className="pointer-events-auto flex flex-wrap justify-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs transition-colors",
                activeCategory === null
                  ? "border-foreground bg-foreground text-background"
                  : "border-border/35 bg-card text-muted-foreground",
              )}
            >
              All
            </button>
            {RESOURCE_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory((current) => (current === category ? null : category))}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors",
                  activeCategory === category
                    ? "border-foreground bg-foreground text-background"
                    : "border-border/35 bg-card text-muted-foreground",
                )}
              >
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: resourceCategoryColor[category] }}
                />
                {resourceCategoryLabel[category]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        className={cn(
          "pointer-events-none absolute top-12 right-5 flex items-center gap-1.5 rounded-full",
          "border border-border/35 bg-card px-3.5 py-2 text-xs text-muted-foreground",
        )}
      >
        <HugeiconsIcon icon={Shield01Icon} className="size-3.5 text-destructive" />
        Protected connection
      </div>
    </div>
  )
}
