import { getResourceQueryOptions } from "@/domains/resources"
import { m } from "@/paraglide/messages"
import { resourceCategoryLabel, type ResourceCategory } from "@/data/resource-categories"
import { formatRelativeTime } from "@/lib/relative-time"
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
import { useSuspenseQuery } from "@tanstack/react-query"

export const Route = createFileRoute("/(public)/r/$resourceId/details/")({
  loader: ({ context, params }) =>
    context.queryClient.query({
      ...getResourceQueryOptions(params.resourceId),
      staleTime: "static",
    }),
  component: RouteComponent,
})

function RouteComponent() {
  const { resourceId } = Route.useParams()
  const { data: resource } = useSuspenseQuery(getResourceQueryOptions(resourceId))

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

  // a submitted resource always gets a trust_signal row atomically
  // (spec 0003-resource-directory AC-3); this default only guards
  // against a data inconsistency that shouldn't occur in practice
  const trust = resource.trust ?? {
    professionalVerified: false,
    coSignCount: 0,
    lastReviewedAt: null as Date | null,
  }
  const services = (() => {
    if (!resource.structuredDetails) return []
    try {
      const parsed = JSON.parse(resource.structuredDetails) as { services?: unknown }
      return Array.isArray(parsed.services) ? parsed.services.filter((s): s is string => typeof s === "string") : []
    } catch {
      return []
    }
  })()
  const hasTrustSignals =
    trust.professionalVerified || trust.lastReviewedAt || trust.coSignCount > 0 || resource.internationalAccess

  return (
    <article className="container mx-auto flex w-full flex-col gap-6 py-10 md:max-w-5xl">
      <Link to="/r" className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground">
        <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3.5" />
        {m["pages.resources.detail.backToResources"]()}, {resource.city}, {resource.countryName}
      </Link>

      <div className="flex flex-col gap-6 md:flex-row">
        <div className="flex flex-2 flex-col gap-7">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2.5">
              {trust.professionalVerified ? (
                <h6 className="flex items-center gap-1">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} className="size-3" />
                  {m["pages.resources.detail.verified"]()}
                </h6>
              ) : (
                <h6>{m["pages.resources.detail.pendingReview"]()}</h6>
              )}
              {(trust.lastReviewedAt || trust.coSignCount > 0) && (
                <p>
                  {trust.lastReviewedAt &&
                    m["pages.resources.detail.lastReviewedCount"]({
                      when: formatRelativeTime(trust.lastReviewedAt),
                    })}
                  {trust.lastReviewedAt && trust.coSignCount > 0 ? " · " : ""}
                  {trust.coSignCount > 0 &&
                    m["pages.resources.detail.communityReportsCount"]({ count: trust.coSignCount })}
                </p>
              )}
            </div>
            <h1>{resource.name}</h1>
            <p>
              {resourceCategoryLabel[resource.category as ResourceCategory]} · {resource.city}, {resource.countryName}
            </p>
          </div>

          <div className="flex h-56 items-center justify-center rounded-3xl border border-border bg-card">
            <p>{m["pages.resources.detail.photoPlaceholder"]({ name: resource.name })}</p>
          </div>

          <div className="flex flex-col gap-2">
            <h2>{m["pages.resources.detail.about"]()}</h2>
            <p>{resource.description}</p>
          </div>

          {services.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2>{m["pages.resources.detail.services"]()}</h2>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {services.map((service) => (
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
                <h6 className="text-foreground">{resource.city}, {resource.countryName}</h6>
                <p>{m["pages.resources.detail.locationGatedNote"]()}</p>
              </div>
              <Button variant="outline" disabled className="h-10 shrink-0 gap-1.5 rounded-full px-5">
                <HugeiconsIcon icon={SquareLock02Icon} />
                {m["pages.resources.detail.requestFullAddress"]()}
              </Button>
            </div>
          </div>
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
              {trust.professionalVerified && (
                <p className="flex items-center gap-2">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} className="size-3.5" />
                  {m["pages.resources.detail.verified"]()}
                </p>
              )}
              {trust.coSignCount > 0 && (
                <p className="flex items-center gap-2">
                  <HugeiconsIcon icon={UserGroup02Icon} className="size-3.5" />
                  {m["pages.resources.detail.communityReportsCount"]({ count: trust.coSignCount })}
                </p>
              )}
              {trust.lastReviewedAt && (
                <p className="flex items-center gap-2">
                  <HugeiconsIcon icon={Clock01Icon} className="size-3.5" />
                  {m["pages.resources.detail.lastReviewedCount"]({ when: formatRelativeTime(trust.lastReviewedAt) })}
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
