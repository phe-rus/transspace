import { storyTopicLabel, type StoryTopic } from "@/data/stories"
import { getGuideQueryOptions } from "@/domains/guides"
import { m } from "@/paraglide/messages"
import { ArrowLeft01Icon, InformationCircleIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Preview } from "@pherus/rich-text"
import { Button } from "@pherus/ui/button"
import { useSuspenseQuery } from "@tanstack/react-query"
import { Link, createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/(public)/stories/$storyId/details/")({
  loader: ({ context, params }) =>
    context.queryClient.query({
      ...getGuideQueryOptions(params.storyId),
      staleTime: "static",
    }),
  component: RouteComponent,
})

function RouteComponent() {
  const { storyId } = Route.useParams()
  const { data: story } = useSuspenseQuery(getGuideQueryOptions(storyId))

  if (!story || story.kind !== "story") {
    return (
      <article className="container mx-auto flex min-h-[50vh] w-full flex-col items-center justify-center gap-3 py-10 text-center md:max-w-5xl">
        <h1>{m["pages.stories.notFoundTitle"]()}</h1>
        <p>{m["pages.stories.notFoundBody"]()}</p>
        <Button variant="outline" nativeButton={false} render={<Link to="/stories" />} className="rounded-full">
          {m["pages.stories.backToStories"]()}
        </Button>
      </article>
    )
  }

  let bodyContent: unknown
  try {
    bodyContent = JSON.parse(story.bodyContent)
  } catch {
    bodyContent = null
  }

  return (
    <article className="container mx-auto flex w-full flex-col gap-6 py-10 md:max-w-3xl">
      <Link to="/stories" className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground">
        <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3.5" />
        {m["pages.stories.backToStories"]()}
      </Link>

      <div className="flex flex-col gap-2">
        <h1>{story.title}</h1>
        <p>
          {storyTopicLabel[story.category as StoryTopic]} ·{" "}
          {story.contributor ?? m["pages.stories.anonymous"]()} ·{" "}
          {m["pages.guides.readTimeMinutes"]({ count: story.readTime })}
        </p>
      </div>

      <p className="flex items-start gap-2 text-foreground">
        <HugeiconsIcon icon={InformationCircleIcon} className="mt-0.5 size-4 shrink-0" />
        {m["pages.stories.experienceNote"]()}
      </p>

      {bodyContent ? (
        <Preview content={bodyContent as never} />
      ) : (
        <p>{story.excerpt}</p>
      )}
    </article>
  )
}
