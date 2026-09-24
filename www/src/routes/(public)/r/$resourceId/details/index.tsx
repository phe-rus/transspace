import { atlasResources } from "@/data/atlas-resources"
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
        <h1>Resource not found</h1>
        <p>It may have been removed, or the link is out of date.</p>
        <Button variant="outline" nativeButton={false} render={<Link to="/r" />} className="rounded-full">
          Back to resources
        </Button>
      </article>
    )
  }

  const hasTrustSignals = resource.verified || resource.lastReviewed || resource.communityReportsCount || resource.internationalAccess

  return (
    <article className="container mx-auto flex w-full flex-col gap-6 py-10 md:max-w-5xl">
      <Link to="/r" className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground">
        <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3.5" />
        Back to resources, {resource.city}, {resource.country}
      </Link>

      <div className="flex flex-col gap-6 md:flex-row">
        <div className="flex flex-2 flex-col gap-7">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2.5">
              {resource.verified ? (
                <h6 className="flex items-center gap-1">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} className="size-3" />
                  Community verified
                </h6>
              ) : (
                <h6>Community submitted, awaiting review</h6>
              )}
              {(resource.lastReviewed || resource.communityReportsCount) && (
                <p>
                  {resource.lastReviewed && `Last reviewed ${resource.lastReviewed}`}
                  {resource.lastReviewed && resource.communityReportsCount ? " · " : ""}
                  {resource.communityReportsCount && `${resource.communityReportsCount} community reports`}
                </p>
              )}
            </div>
            <h1>{resource.name}</h1>
            <p>
              {resourceCategoryLabel[resource.category]} · {resource.city}, {resource.country}
            </p>
          </div>

          <div className="flex h-56 items-center justify-center rounded-3xl border border-border bg-card">
            <p>{resource.name} photo</p>
          </div>

          <div className="flex flex-col gap-2">
            <h2>About</h2>
            <p>{resource.description}</p>
          </div>

          {resource.services && resource.services.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2>Services</h2>
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
            <h2>Location</h2>
            <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 sm:flex-row sm:items-center">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-muted">
                <HugeiconsIcon icon={MapPinpoint01Icon} className="size-6" />
              </span>
              <div className="flex flex-1 flex-col gap-1">
                <h6 className="text-foreground">{resource.city}, {resource.country}</h6>
                <p>Exact address and entrance notes are shared once your account has vetted status.</p>
              </div>
              <Button variant="outline" disabled className="h-10 shrink-0 gap-1.5 rounded-full px-5">
                <HugeiconsIcon icon={SquareLock02Icon} />
                Request full address
              </Button>
            </div>
          </div>

          {resource.reviews && resource.reviews.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2>Community experiences</h2>
              {resource.reviews.map((review) => (
                <div key={review.postedAt} className="flex flex-col gap-1.5 rounded-3xl border border-border bg-card p-5">
                  <p className="text-foreground italic">"{review.quote}"</p>
                  <p>Anonymous community member · {review.postedAt}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-4 md:sticky md:top-11 md:self-start">
          <div className="flex flex-col gap-2.5 rounded-3xl border border-border bg-card p-5">
            <Button disabled className="h-10 rounded-full">
              Save this resource
            </Button>
            <Button variant="outline" disabled className="h-10 rounded-full">
              Suggest an update
            </Button>
          </div>

          {hasTrustSignals && (
            <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-5">
              <h6>Trust signals</h6>
              {resource.verified && (
                <p className="flex items-center gap-2">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} className="size-3.5" />
                  Community verified
                </p>
              )}
              {typeof resource.communityReportsCount === "number" && (
                <p className="flex items-center gap-2">
                  <HugeiconsIcon icon={UserGroup02Icon} className="size-3.5" />
                  {resource.communityReportsCount} community reports
                </p>
              )}
              {resource.lastReviewed && (
                <p className="flex items-center gap-2">
                  <HugeiconsIcon icon={Clock01Icon} className="size-3.5" />
                  Last reviewed {resource.lastReviewed}
                </p>
              )}
              {resource.internationalAccess && (
                <p className="flex items-center gap-2">
                  <HugeiconsIcon icon={Globe02Icon} className="size-3.5" />
                  Accepts people from other countries
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
