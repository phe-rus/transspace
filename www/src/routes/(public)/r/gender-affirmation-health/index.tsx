import { ResourceCard } from "@/components/resources/resource-card"
import { listResourcesQueryOptions } from "@/domains/resources"
import { m } from "@/paraglide/messages"
import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/(public)/r/gender-affirmation-health/")({
  loader: ({ context }) =>
    context.queryClient.query({
      ...listResourcesQueryOptions({ category: "health", subcategory: "gender-affirmation-health" }),
      staleTime: "static",
    }),
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = useSuspenseQuery(listResourcesQueryOptions({ category: "health", subcategory: "gender-affirmation-health" }))

  return (
    <article className="container mx-auto flex w-full flex-col gap-6 py-10 md:max-w-5xl">
      <div className="flex flex-col gap-2">
        <h1>{m["pages.resources.genderAffirmationHealth.title"]()}</h1>
        <p>{m["pages.resources.genderAffirmationHealth.subtitle"]()}</p>
      </div>

      <div className="flex flex-col gap-3.5">
        {data.items.map((resource) => (
          <ResourceCard key={resource.id} resource={resource} />
        ))}

        {data.items.length === 0 && (
          <div className="flex min-h-16 items-center justify-center rounded-4xl border border-dashed border-border p-5 text-center">
            <p>{m["pages.resources.genderAffirmationHealth.empty"]()}</p>
          </div>
        )}
      </div>
    </article>
  )
}
