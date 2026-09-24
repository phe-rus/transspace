import { GuideCard } from "@/components/guides/guide-card"
import {
  GUIDE_CATEGORIES,
  guideCategoryIcon,
  guideCategoryLabel,
  guides,
  type GuideCategory,
} from "@/data/guides"
import { Add01Icon, SearchIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@pherus/ui/button"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@pherus/ui/input-group"
import { cn } from "@pherus/ui/lib/utils"
import { createFileRoute } from "@tanstack/react-router"
import { useMemo, useState } from "react"

export const Route = createFileRoute("/(public)/guides/")({
  component: RouteComponent,
})

function RouteComponent() {
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState<GuideCategory | null>(null)

  const filteredGuides = useMemo(() => {
    const query = search.trim().toLowerCase()
    return guides.filter((guide) => {
      const matchesCategory = !activeCategory || guide.category === activeCategory
      const matchesSearch =
        !query || guide.title.toLowerCase().includes(query) || guide.excerpt.toLowerCase().includes(query)
      return matchesCategory && matchesSearch
    })
  }, [search, activeCategory])

  return (
    <article className="container mx-auto flex w-full flex-col gap-6 py-10 md:max-w-5xl">
      <div className="flex flex-col gap-2">
        <h1>Skills & learning</h1>
        <p className="max-w-lg">
          Practical, community-contributed guides, from a first hormone consultation to rebuilding a resume after a
          gap.
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
              placeholder='Search guides, e.g. "name change"'
            />
          </InputGroup>
          <Button variant="secondary" disabled className="h-11 shrink-0 gap-1.5 rounded-full px-5">
            <HugeiconsIcon icon={Add01Icon} />
            Contribute a guide
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
          {GUIDE_CATEGORIES.map((category) => (
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
              <HugeiconsIcon icon={guideCategoryIcon[category]} className="size-3.5" />
              {guideCategoryLabel[category]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
        {filteredGuides.map((guide) => (
          <GuideCard key={guide.id} guide={guide} />
        ))}

        {filteredGuides.length === 0 && (
          <div className="flex min-h-16 items-center justify-center rounded-4xl border border-dashed border-border p-5 text-center md:col-span-2">
            <p>No matches. Try a different search, or clear a filter.</p>
          </div>
        )}
      </div>
    </article>
  )
}
