import { ResourceCard } from "@/components/resources/resource-card"
import { listResourcesQueryOptions } from "@/domains/resources"
import { m } from "@/paraglide/messages"
import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/(public)/r/safe-space/")({
  loader: ({ context }) =>
    context.queryClient.query({
      ...listResourcesQueryOptions({ category: "housing", subcategory: "safe-space" }),
      staleTime: "static",
    }),
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = useSuspenseQuery(listResourcesQueryOptions({ category: "housing", subcategory: "safe-space" }))

  return (
    <article className="container mx-auto flex w-full flex-col gap-6 py-10 md:max-w-5xl">
      <div className="flex flex-col gap-2">
        <h1>{m["pages.resources.safeSpace.title"]()}</h1>
        <p>{m["pages.resources.safeSpace.subtitle"]()}</p>
      </div>

      <div className="flex flex-col">
        {data.items.map((resource) => (
          <ResourceCard key={resource.id} resource={resource} />
        ))}

        {data.items.length === 0 && (
          <p className="border-t border-border/60 py-10 text-center">
            {m["pages.resources.safeSpace.empty"]()}
          </p>
        )}
      </div>
    </article>
  )
}
