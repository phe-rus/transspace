import { getGuideQueryOptions } from "@/domains/guides"
import { CommentSection } from "@/components/comments/comment-section"
import { guideCategoryLabel, type GuideCategory } from "@/data/guides"
import { toEmbedUrl } from "@/lib/video-embed"
import { m } from "@/paraglide/messages"
import { Preview } from "@pherus/rich-text"
import {
  ArrowLeft01Icon,
  CheckmarkCircle01Icon,
  Link04Icon,
  UserGroup02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@pherus/ui/button"
import { Link, createFileRoute } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"

export const Route = createFileRoute("/(public)/guides/$guideId/details/")({
  loader: ({ context, params }) =>
    context.queryClient.query({
      ...getGuideQueryOptions(params.guideId),
      staleTime: "static",
    }),
  component: RouteComponent,
})

function RouteComponent() {
  const { guideId } = Route.useParams()
  const { data: guide } = useSuspenseQuery(getGuideQueryOptions(guideId))

  if (!guide) {
    return (
      <article className="container mx-auto flex min-h-[50vh] w-full flex-col items-center justify-center gap-3 py-10 text-center md:max-w-5xl">
        <h1>{m["pages.guides.detail.notFoundTitle"]()}</h1>
        <p>{m["pages.guides.detail.notFoundBody"]()}</p>
        <Button variant="outline" nativeButton={false} render={<Link to="/guides" />} className="rounded-full">
          {m["pages.guides.detail.backToGuides"]()}
        </Button>
      </article>
    )
  }

  let bodyContent: unknown
  try {
    bodyContent = JSON.parse(guide.bodyContent)
  } catch {
    bodyContent = null
  }

  const embedUrl = toEmbedUrl(guide.videoUrl)

  return (
    <article className="container mx-auto flex w-full flex-col gap-6 py-10 md:max-w-5xl">
      <Link to="/guides" className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground">
        <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3.5" />
        {m["pages.guides.detail.backToGuides"]()}
      </Link>

      {guide.coverImageUrl && (
        <img
          src={guide.coverImageUrl}
          alt=""
          className="h-56 w-full rounded-3xl object-cover md:h-72"
        />
      )}

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2.5">
          {guide.trust.communityReviewed && (
            <h6 className="flex items-center gap-1 text-success">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} className="size-3" />
              {m["pages.guides.communityReviewed"]()}
            </h6>
          )}
        </div>
        {guide.seriesTitle && (
          <p className="text-sm text-muted-foreground">
            {guide.seriesOrder
              ? m["pages.guides.seriesPartOf"]({ title: guide.seriesTitle, order: guide.seriesOrder })
              : guide.seriesTitle}
          </p>
        )}
        <h1>{guide.title}</h1>
        <p>
          {guideCategoryLabel[guide.category as GuideCategory]} · {guide.contributor} ·{" "}
          {m["pages.guides.readTimeMinutes"]({ count: guide.readTime })}
        </p>
      </div>

      {embedUrl && (
        <div className="aspect-video w-full overflow-hidden rounded-3xl">
          <iframe
            src={embedUrl}
            title={m["pages.guides.detail.watchVideo"]()}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="size-full"
          />
        </div>
      )}

      {bodyContent ? (
        <Preview content={bodyContent as never} />
      ) : (
        <p>{guide.excerpt}</p>
      )}

      {(guide.trust.referencesAvailable || guide.relatedResources.length > 0) && (
        <div className="flex flex-col gap-3 border-t border-border/60 pt-5">
          <h6>{m["pages.guides.detail.trustSignals"]()}</h6>
          {guide.trust.referencesAvailable && (
            <p className="flex items-center gap-2">
              <HugeiconsIcon icon={Link04Icon} className="size-3.5" />
              {m["pages.guides.detail.referencesAvailable"]()}
            </p>
          )}
          {guide.trust.coSignCount > 0 && (
            <p className="flex items-center gap-2">
              <HugeiconsIcon icon={UserGroup02Icon} className="size-3.5" />
              {m["pages.resources.detail.communityReportsCount"]({ count: guide.trust.coSignCount })}
            </p>
          )}
        </div>
      )}

      {guide.seriesGuides.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2>{m["pages.guides.detail.series"]()}</h2>
          <div className="flex flex-col">
            {guide.seriesGuides.map((sibling) => (
              <Link
                key={sibling.id}
                to="/guides/$guideId/details"
                params={{ guideId: sibling.id }}
                className="flex items-center justify-between gap-2 border-t border-border/60 py-3 text-sm text-foreground underline-offset-4 hover:underline"
              >
                {sibling.title}
                {sibling.seriesOrder && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {m["pages.guides.detail.partNumber"]({ order: sibling.seriesOrder })}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {guide.relatedResources.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2>{m["pages.guides.detail.relatedResources"]()}</h2>
          <div className="flex flex-col">
            {guide.relatedResources.map((related) => (
              <Link
                key={related.id}
                to="/r/$resourceId/details"
                params={{ resourceId: related.id }}
                className="border-t border-border/60 py-3 text-sm text-foreground underline-offset-4 hover:underline"
              >
                {related.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {guide.status === "published" && (
        <CommentSection contentType="guide" contentId={guide.id} />
      )}
    </article>
  )
}
