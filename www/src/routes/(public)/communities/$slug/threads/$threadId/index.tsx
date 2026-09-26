import { CommentSection } from "@/components/comments/comment-section"
import { communityLabel, threadTypeLabel } from "@/data/communities"
import { getThreadQueryOptions } from "@/domains/guides"
import { formatRelativeTime } from "@/lib/relative-time"
import { m } from "@/paraglide/messages"
import { getLocale } from "@/paraglide/runtime"
import { ArrowLeft01Icon, InformationCircleIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Preview } from "@pherus/rich-text"
import { Button } from "@pherus/ui/button"
import { useSuspenseQuery } from "@tanstack/react-query"
import { Link, createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/(public)/communities/$slug/threads/$threadId/")({
  loader: ({ context, params }) =>
    context.queryClient.query({
      ...getThreadQueryOptions(params.threadId),
      staleTime: "static",
    }),
  component: RouteComponent,
})

function RouteComponent() {
  const { threadId } = Route.useParams()
  const { data: thread } = useSuspenseQuery(getThreadQueryOptions(threadId))

  if (!thread) {
    return (
      <article className="container mx-auto flex min-h-[50vh] w-full flex-col items-center justify-center gap-3 py-10 text-center md:max-w-3xl">
        <h1>{m["pages.communities.notFoundTitle"]()}</h1>
        <p>{m["pages.communities.notFoundBody"]()}</p>
        <Button variant="outline" nativeButton={false} render={<Link to="/communities" />} className="rounded-full">
          {m["pages.communities.backToCommunities"]()}
        </Button>
      </article>
    )
  }

  let bodyContent: unknown
  try {
    bodyContent = JSON.parse(thread.bodyContent)
  } catch {
    bodyContent = null
  }

  return (
    <article className="container mx-auto flex w-full flex-col gap-6 py-10 md:max-w-3xl">
      <Link
        to="/communities/$slug"
        params={{ slug: thread.slug }}
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3.5" />
        {communityLabel(thread.slug)}
      </Link>

      <div className="flex flex-col gap-2">
        <h1>{thread.title}</h1>
        <p>
          {[
            threadTypeLabel(thread.threadType),
            thread.contributor ?? m["pages.communities.anonymous"](),
            formatRelativeTime(new Date(thread.createdAt), getLocale()),
          ].join(" · ")}
        </p>
      </div>

      {thread.status !== "published" && (
        <p className="flex items-start gap-2 text-foreground">
          <HugeiconsIcon icon={InformationCircleIcon} className="mt-0.5 size-4 shrink-0" />
          {m["pages.communities.pendingNotice"]()}
        </p>
      )}

      {thread.isHealth && (
        <p className="flex items-start gap-2 text-foreground">
          <HugeiconsIcon icon={InformationCircleIcon} className="mt-0.5 size-4 shrink-0" />
          {m["pages.communities.healthNotice"]()}
        </p>
      )}

      {bodyContent ? (
        <Preview content={bodyContent as never} />
      ) : (
        <p>{thread.excerpt}</p>
      )}

      {thread.status === "published" && (
        <CommentSection contentType="guide" contentId={thread.id} />
      )}
    </article>
  )
}
