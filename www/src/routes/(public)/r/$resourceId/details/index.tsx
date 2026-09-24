import { atlasResources } from "@/data/atlas-resources"
import { m } from "@/paraglide/messages"
import { resourceCategoryLabel } from "@/data/resource-categories"
import {
  ArrowLeft01Icon,
  CheckmarkCircle01Icon,
  Clock01Icon,
  Globe02Icon,
  MapPinpoint01Icon,
  SquareLock02Icon,
  UserGroup02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@pherus/ui/button"
import { Link, createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/(public)/r/$resourceId/details/")({
  component: RouteComponent,
})

function RouteComponent() {
  const { resourceId } = Route.useParams()
  const resource = atlasResources.find((item) => item.id === resourceId)

  if (!resource) {
    return (
      <article className="container mx-auto flex min-h-[50vh] w-full flex-col items-center justify-center gap-3 py-10 text-center md:max-w-5xl">
        <h1>{m["pages.resources.detail.notFoundTitle"]()}</h1>
        <p>{m["pages.resources.detail.notFoundBody"]()}</p>
        <Button variant="outline" nativeButton={false} render={<Link to="/r" />} className="rounded-full">
          {m["pages.resources.detail.backToResources"]()}
        </Button>
      </article>
    )
  }

  const hasTrustSignals = resource.verified || resource.lastReviewed || resource.communityReportsCount || resource.internationalAccess

  return (
    <article className="container mx-auto flex w-full flex-col gap-6 py-10 md:max-w-5xl">
      <Link to="/r" className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground">
        <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3.5" />
        {m["pages.resources.detail.backToResources"]()}, {resource.city}, {resource.country}
      </Link>

      <div className="flex flex-col gap-6 md:flex-row">
        <div className="flex flex-2 flex-col gap-7">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2.5">
              {resource.verified ? (
                <h6 className="flex items-center gap-1">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} className="size-3" />
                  {m["pages.resources.detail.verified"]()}
                </h6>
              ) : (
                <h6>{m["pages.resources.detail.pendingReview"]()}</h6>
              )}
              {(resource.lastReviewed || resource.communityReportsCount) && (
                <p>
                  {resource.lastReviewed && m["pages.resources.detail.lastReviewedCount"]({ when: resource.lastReviewed })}
                  {resource.lastReviewed && resource.communityReportsCount ? " · " : ""}
                  {resource.communityReportsCount && m["pages.resources.detail.communityReportsCount"]({ count: resource.communityReportsCount })}
                </p>
              )}
            </div>
            <h1>{resource.name}</h1>
            <p>
              {resourceCategoryLabel[resource.category]} · {resource.city}, {resource.country}
            </p>
          </div>

          <div className="flex h-56 items-center justify-center rounded-3xl border border-border bg-card">
            <p>{m["pages.resources.detail.photoPlaceholder"]({ name: resource.name })}</p>
          </div>

          <div className="flex flex-col gap-2">
            <h2>{m["pages.resources.detail.about"]()}</h2>
            <p>{resource.description}</p>
          </div>

          {resource.services && resource.services.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2>{m["pages.resources.detail.services"]()}</h2>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {resource.services.map((service) => (
                  <div key={service} className="rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground">
                    {service}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <h2>{m["pages.resources.detail.location"]()}</h2>
            <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 sm:flex-row sm:items-center">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-muted">
                <HugeiconsIcon icon={MapPinpoint01Icon} className="size-6" />
              </span>
              <div className="flex flex-1 flex-col gap-1">
                <h6 className="text-foreground">{resource.city}, {resource.country}</h6>
                <p>{m["pages.resources.detail.locationGatedNote"]()}</p>
              </div>
              <Button variant="outline" disabled className="h-10 shrink-0 gap-1.5 rounded-full px-5">
                <HugeiconsIcon icon={SquareLock02Icon} />
                {m["pages.resources.detail.requestFullAddress"]()}
              </Button>
            </div>
          </div>

          {resource.reviews && resource.reviews.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2>{m["pages.resources.detail.communityExperiences"]()}</h2>
              {resource.reviews.map((review) => (
                <div key={review.postedAt} className="flex flex-col gap-1.5 rounded-3xl border border-border bg-card p-5">
                  <p className="text-foreground italic">"{review.quote}"</p>
                  <p>{m["pages.resources.detail.anonymousCommunityMember"]()} · {review.postedAt}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-4 md:sticky md:top-11 md:self-start">
          <div className="flex flex-col gap-2.5 rounded-3xl border border-border bg-card p-5">
            <Button disabled className="h-10 rounded-full">
              {m["pages.resources.detail.saveResource"]()}
            </Button>
            <Button variant="outline" disabled className="h-10 rounded-full">
              {m["pages.resources.detail.suggestUpdate"]()}
            </Button>
          </div>

          {hasTrustSignals && (
            <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-5">
              <h6>{m["pages.resources.detail.trustSignals"]()}</h6>
              {resource.verified && (
                <p className="flex items-center gap-2">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} className="size-3.5" />
                  {m["pages.resources.detail.verified"]()}
                </p>
              )}
              {typeof resource.communityReportsCount === "number" && (
                <p className="flex items-center gap-2">
                  <HugeiconsIcon icon={UserGroup02Icon} className="size-3.5" />
                  {m["pages.resources.detail.communityReportsCount"]({ count: resource.communityReportsCount })}
                </p>
              )}
              {resource.lastReviewed && (
                <p className="flex items-center gap-2">
                  <HugeiconsIcon icon={Clock01Icon} className="size-3.5" />
                  {m["pages.resources.detail.lastReviewedCount"]({ when: resource.lastReviewed })}
                </p>
              )}
              {resource.internationalAccess && (
                <p className="flex items-center gap-2">
                  <HugeiconsIcon icon={Globe02Icon} className="size-3.5" />
                  {m["pages.resources.detail.internationalAccessNote"]()}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
