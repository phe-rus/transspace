import { GuideCard } from "@/components/guides/guide-card"
import { listGuidesQueryOptions } from "@/domains/guides"
import { m } from "@/paraglide/messages"
import {
  GUIDE_CATEGORIES,
  guideCategoryIcon,
  guideCategoryLabel,
} from "@/data/guides"
import { Add01Icon, SearchIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@pherus/ui/button"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@pherus/ui/input-group"
import { cn } from "@pherus/ui/lib/utils"
import { Link, createFileRoute } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import { z } from "zod"

const searchSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
})

export const Route = createFileRoute("/(public)/guides/")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.query({
      ...listGuidesQueryOptions(deps),
      staleTime: "static",
    }),
  component: RouteComponent,
})

function RouteComponent() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data } = useSuspenseQuery(listGuidesQueryOptions(search))

  const patchSearch = (patch: Partial<typeof search>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }) })

  return (
    <article className="container mx-auto flex w-full flex-col gap-6 py-10 md:max-w-5xl">
      <div className="flex flex-col gap-2">
        <h1>{m["pages.guides.title"]()}</h1>
        <p className="max-w-lg">
          {m["pages.guides.subtitle"]()}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <InputGroup className="h-11 flex-1 rounded-full">
            <InputGroupAddon align="inline-start">
              <HugeiconsIcon icon={SearchIcon} className="size-4" />
            </InputGroupAddon>
            <InputGroupInput
              value={search.search ?? ""}
              onChange={(event) =>
                patchSearch({ search: event.target.value || undefined })
              }
              placeholder={m["pages.guides.searchPlaceholder"]()}
            />
          </InputGroup>
          <Button
            variant="secondary"
            nativeButton={false}
            render={<Link to="/submit-guide" />}
            className="h-11 shrink-0 gap-1.5 rounded-full px-5"
          >
            <HugeiconsIcon icon={Add01Icon} />
            {m["pages.guides.contribute"]()}
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
            {m["pages.guides.all"]()}
          </button>
          {GUIDE_CATEGORIES.map((category) => (
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
              <HugeiconsIcon icon={guideCategoryIcon[category]} className="size-3.5" />
              {guideCategoryLabel[category]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
        {data.items.map((guide) => (
          <GuideCard key={guide.id} guide={guide} />
        ))}

        {data.items.length === 0 && (
          <div className="flex min-h-16 items-center justify-center rounded-4xl border border-dashed border-border p-5 text-center md:col-span-2">
            <p>{m["pages.guides.noMatches"]()}</p>
          </div>
        )}
      </div>
    </article>
  )
}
