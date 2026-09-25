import { getGuideQueryOptions } from "@/domains/guides"
import { guideCategoryLabel, type GuideCategory } from "@/data/guides"
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
      <article className="container mx-auto flex min-h-[50vh] w-full flex-col items-center justify-center gap-3 py-10 text-center md:max-w-3xl">
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

  return (
    <article className="container mx-auto flex w-full flex-col gap-6 py-10 md:max-w-3xl">
      <Link to="/guides" className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground">
        <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3.5" />
        {m["pages.guides.detail.backToGuides"]()}
      </Link>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2.5">
          {guide.trust.communityReviewed && (
            <h6 className="flex items-center gap-1 text-success">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} className="size-3" />
              {m["pages.guides.communityReviewed"]()}
            </h6>
          )}
        </div>
        <h1>{guide.title}</h1>
        <p>
          {guideCategoryLabel[guide.category as GuideCategory]} · {guide.contributor} ·{" "}
          {m["pages.guides.readTimeMinutes"]({ count: guide.readTime })}
        </p>
      </div>

      {bodyContent ? (
        <Preview content={bodyContent as never} />
      ) : (
        <p>{guide.excerpt}</p>
      )}

      {(guide.trust.referencesAvailable || guide.relatedResources.length > 0) && (
        <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-5">
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

      {guide.relatedResources.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2>{m["pages.guides.detail.relatedResources"]()}</h2>
          <div className="flex flex-col gap-2">
            {guide.relatedResources.map((related) => (
              <Link
                key={related.id}
                to="/r/$resourceId/details"
                params={{ resourceId: related.id }}
                className="rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
              >
                {related.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </article>
  )
}
