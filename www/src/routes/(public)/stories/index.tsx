import { StoryCard } from "@/components/stories/story-card"
import { STORY_TOPICS, storyTopicIcon, storyTopicLabel } from "@/data/stories"
import { listGuidesQueryOptions } from "@/domains/guides"
import { authGateQueryOptions } from "@/lib/auth-gate"
import { m } from "@/paraglide/messages"
import { SearchField } from "@/components/search-field"
import { Add01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@pherus/ui/button"
import { cn } from "@pherus/ui/lib/utils"
import { useSuspenseQuery } from "@tanstack/react-query"
import { Link, createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

export const Route = createFileRoute("/(public)/stories/")({
  validateSearch: z.object({
    search: z.string().optional(),
    topic: z.string().optional(),
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    Promise.all([
      context.queryClient.query({
        ...listGuidesQueryOptions({
          kind: "story",
          search: deps.search,
          category: deps.topic,
        }),
        staleTime: "static",
      }),
      context.queryClient.query({
        ...authGateQueryOptions(),
        staleTime: "static",
      }),
    ]),
  component: RouteComponent,
})

function RouteComponent() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data } = useSuspenseQuery(
    listGuidesQueryOptions({
      kind: "story",
      search: search.search,
      category: search.topic,
    })
  )
  const { data: authGate } = useSuspenseQuery(authGateQueryOptions())

  const patchSearch = (patch: Partial<typeof search>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }) })

  return (
    <article className="container mx-auto flex w-full flex-col gap-6 py-10 md:max-w-5xl">
      <div className="flex flex-col gap-2">
        <h1>{m["pages.stories.title"]()}</h1>
        <p className="max-w-lg">{m["pages.stories.subtitle"]()}</p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <SearchField
            value={search.search}
            onChange={(value) => patchSearch({ search: value })}
            placeholder={m["pages.stories.searchPlaceholder"]()}
          />
          <Button
            variant="secondary"
            nativeButton={false}
            render={<Link to={authGate.signedIn ? "/submit-story" : "/auth"} />}
            className="h-11 shrink-0 gap-1.5 rounded-full px-5"
          >
            <HugeiconsIcon icon={Add01Icon} />
            {authGate.signedIn
              ? m["pages.stories.share"]()
              : m["pages.stories.signInToShare"]()}
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => patchSearch({ topic: undefined })}
            className={cn(
              "rounded-full border px-3.5 py-2 text-sm transition-colors",
              !search.topic
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-muted-foreground",
            )}
          >
            {m["pages.stories.all"]()}
          </button>
          {STORY_TOPICS.map((topic) => (
            <button
              key={topic}
              type="button"
              onClick={() =>
                patchSearch({ topic: search.topic === topic ? undefined : topic })
              }
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors",
                search.topic === topic
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:border-muted-foreground",
              )}
            >
              <HugeiconsIcon icon={storyTopicIcon[topic]} className="size-3.5" />
              {storyTopicLabel[topic]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-x-12 md:grid-cols-2">
        {data.items.map((story) => (
          <StoryCard key={story.id} story={story} />
        ))}

        {data.items.length === 0 && (
          <p className="py-10 text-center md:col-span-2">
            {m["pages.stories.noMatches"]()}
          </p>
        )}
      </div>
    </article>
  )
}
