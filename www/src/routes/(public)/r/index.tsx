import { ResourceCard } from "@/components/resources/resource-card"
import { listCountriesQueryOptions, listResourcesQueryOptions } from "@/domains/resources"
import { m } from "@/paraglide/messages"
import { SearchField } from "@/components/search-field"
import {
  RESOURCE_CATEGORIES,
  RESOURCE_TIERS,
  resourceCategoryColor,
  resourceCategoryLabel,
  type ResourceCategory,
} from "@/data/resource-categories"
import { MapPinpoint01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@pherus/ui/button"
import { cn } from "@pherus/ui/lib/utils"
import { Link, createFileRoute } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import { z } from "zod"

export const Route = createFileRoute("/(public)/r/")({
  // held only in the URL, never in localStorage or any other
  // persistent client storage (spec 0003-resource-directory AC-6).
  // countryId, not a free-text name: the picker is a list of countries
  // that actually have published resources, never a blind text field
  // with no feedback about what's there (city is dropped for now, see
  // Follow-up)
  validateSearch: z.object({
    search: z.string().optional(),
    category: z.string().optional(),
    countryId: z.string().optional(),
    verifiedOnly: z.boolean().optional(),
    tier: z.enum(RESOURCE_TIERS).optional(),
    freeOnly: z.boolean().optional(),
    internationalOnly: z.boolean().optional(),
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    Promise.all([
      context.queryClient.query({
        ...listResourcesQueryOptions(deps),
        staleTime: "static",
      }),
      context.queryClient.query({
        ...listCountriesQueryOptions(),
        staleTime: "static",
      }),
    ]),
  component: RouteComponent,
})

function RouteComponent() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data } = useSuspenseQuery(listResourcesQueryOptions(search))
  const { data: countries } = useSuspenseQuery(listCountriesQueryOptions())

  const patchSearch = (patch: Partial<typeof search>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }) })

  const locationLabel = countries.find((c) => c.id === search.countryId)?.name ?? ""

  return (
    <article className="container mx-auto flex w-full flex-col gap-6 py-10 md:max-w-5xl">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <SearchField
            value={search.search}
            onChange={(value) => patchSearch({ search: value })}
            placeholder={m["pages.resources.index.searchPlaceholder"]()}
          />
          <div
            className={cn(
              "flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground",
            )}
          >
            <HugeiconsIcon icon={MapPinpoint01Icon} className="size-4 shrink-0" />
            <select
              value={search.countryId ?? ""}
              onChange={(event) =>
                patchSearch({ countryId: event.target.value || undefined })
              }
              className="h-7 max-w-32 border-none bg-transparent text-sm outline-none"
            >
              <option value="">{m["pages.resources.index.anyCountry"]()}</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <Button
            variant="secondary"
            nativeButton={false}
            render={<Link to="/submit" />}
            className="h-11 shrink-0 rounded-full px-5"
          >
            {m["pages.resources.index.contribute"]()}
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => patchSearch({ category: undefined })}
            className={cn(
              "rounded-full border px-3.5 py-2 text-sm transition-colors",
              !search.category
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-muted-foreground",
            )}
          >
            {m["pages.resources.index.all"]()}
          </button>
          {RESOURCE_CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() =>
                patchSearch({
                  category: search.category === category ? undefined : category,
                })
              }
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors",
                search.category === category
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:border-muted-foreground",
              )}
            >
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: resourceCategoryColor[category as ResourceCategory] }}
              />
              {resourceCategoryLabel[category as ResourceCategory]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-8 md:flex-row md:gap-10">
        <div className="flex flex-2 flex-col">
          <p className="pb-3">
            {locationLabel
              ? `${m["pages.resources.index.resourcesNearCount"]({ count: data.items.length })} ${locationLabel}`
              : m["pages.resources.index.resourcesCount"]({ count: data.items.length })}
          </p>

          {data.items.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}

          {data.items.length === 0 && (
            <p className="border-t border-border/60 py-10 text-center">
              {m["pages.resources.index.noMatches"]()}
            </p>
          )}
        </div>

        <aside className="flex flex-1 flex-col gap-8 border-t border-border/60 pt-6 md:sticky md:top-11 md:self-start md:border-t-0 md:border-l md:pt-0 md:pl-8">
          <div className="flex flex-col gap-3">
            <h6>{m["pages.resources.index.trustSignals"]()}</h6>
            <label className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={search.verifiedOnly ?? false}
                onChange={(event) =>
                  patchSearch({ verifiedOnly: event.target.checked || undefined })
                }
                className="accent-success"
              />
              {m["pages.resources.index.verifiedOnly"]()}
            </label>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={m["pages.resources.index.careType"]()}>
              {RESOURCE_TIERS.map((tier) => (
                <button
                  key={tier}
                  type="button"
                  aria-pressed={search.tier === tier}
                  onClick={() =>
                    patchSearch({ tier: search.tier === tier ? undefined : tier })
                  }
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs transition-colors",
                    search.tier === tier
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:border-muted-foreground",
                  )}
                >
                  {tier === "verified"
                    ? m["components.resourceCard.verified"]()
                    : m["components.resourceCard.diy"]()}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={search.freeOnly ?? false}
                onChange={(event) =>
                  patchSearch({ freeOnly: event.target.checked || undefined })
                }
                className="accent-success"
              />
              {m["pages.resources.index.freeOnly"]()}
            </label>
            <label className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={search.internationalOnly ?? false}
                onChange={(event) =>
                  patchSearch({ internationalOnly: event.target.checked || undefined })
                }
                className="accent-success"
              />
              {m["pages.resources.index.internationalOnly"]()}
            </label>
          </div>

          <div className="flex flex-col gap-2">
            <h6>{m["pages.resources.index.relatedGuides"]()}</h6>
            <p>Finding gender affirming care in Germany</p>
            <p>What "community verified" actually means</p>
          </div>
        </aside>
      </div>
    </article>
  )
}
