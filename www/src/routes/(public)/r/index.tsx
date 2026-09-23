import { ResourceCard } from "@/components/resources/resource-card"
import { atlasResources } from "@/data/atlas-resources"
import {
  RESOURCE_CATEGORIES,
  resourceCategoryColor,
  resourceCategoryLabel,
  type ResourceCategory,
} from "@/data/resource-categories"
import { MapPinpoint01Icon, SearchIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@pherus/ui/button"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@pherus/ui/input-group"
import { cn } from "@pherus/ui/lib/utils"
import { createFileRoute } from "@tanstack/react-router"
import { useMemo, useState } from "react"

export const Route = createFileRoute("/(public)/r/")({
  component: RouteComponent,
})

function RouteComponent() {
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState<ResourceCategory | null>(null)
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [freeOnly, setFreeOnly] = useState(false)
  const [internationalOnly, setInternationalOnly] = useState(false)

  const filteredResources = useMemo(() => {
    const query = search.trim().toLowerCase()
    return atlasResources.filter((resource) => {
      const matchesCategory = !activeCategory || resource.category === activeCategory
      const matchesSearch =
        !query ||
        resource.name.toLowerCase().includes(query) ||
        resource.description.toLowerCase().includes(query) ||
        resource.city.toLowerCase().includes(query) ||
        resource.country.toLowerCase().includes(query)
      const matchesVerified = !verifiedOnly || resource.verified
      const matchesFree = !freeOnly || resource.estimate.toLowerCase().includes("free")
      const matchesInternational = !internationalOnly || resource.internationalAccess
      return matchesCategory && matchesSearch && matchesVerified && matchesFree && matchesInternational
    })
  }, [search, activeCategory, verifiedOnly, freeOnly, internationalOnly])

  return (
    <article className="container mx-auto flex w-full flex-col gap-6 py-10 md:max-w-5xl">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <InputGroup className="h-11 flex-1 rounded-full">
            <InputGroupAddon align="inline-start">
              <HugeiconsIcon icon={SearchIcon} className="size-4" />
            </InputGroupAddon>
            <InputGroupInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder='Search resources, e.g. "hormone therapy Berlin"'
            />
          </InputGroup>
          <div className={cn(
            "flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm text-muted-foreground",
          )}
          >
            <HugeiconsIcon icon={MapPinpoint01Icon} className="size-4" />
            Berlin, DE
          </div>
          <Button variant="secondary" disabled className="h-11 shrink-0 rounded-full px-5">
            Contribute
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
          {RESOURCE_CATEGORIES.map((category) => (
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
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: resourceCategoryColor[category] }}
              />
              {resourceCategoryLabel[category]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        <div className="flex flex-2 flex-col gap-3.5">
          <p>{filteredResources.length} resources near Berlin, DE</p>

          {filteredResources.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}

          {filteredResources.length === 0 && (
            <div className="flex min-h-16 items-center justify-center rounded-4xl border border-dashed border-border p-5 text-center">
              <p>No matches. Try a different search, or clear a filter.</p>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-5">
            <h6>Trust signals</h6>
            <label className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(event) => setVerifiedOnly(event.target.checked)}
                className="accent-success"
              />
              Community verified only
            </label>
            <label className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={freeOnly}
                onChange={(event) => setFreeOnly(event.target.checked)}
                className="accent-success"
              />
              Sliding scale / free
            </label>
            <label className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={internationalOnly}
                onChange={(event) => setInternationalOnly(event.target.checked)}
                className="accent-success"
              />
              Accepts people from other countries
            </label>
          </div>

          <div className="flex flex-col gap-2 rounded-3xl border border-border bg-card p-5">
            <h6>Related guides</h6>
            <p>Finding gender affirming care in Germany</p>
            <p>What "community verified" actually means</p>
          </div>
        </div>
      </div>
    </article>
  )
}
