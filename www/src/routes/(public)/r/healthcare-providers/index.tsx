import { ResourceCard } from "@/components/resources/resource-card"
import { atlasResources } from "@/data/atlas-resources"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/(public)/r/health/providers")({
  component: RouteComponent,
})

function RouteComponent() {
  const resources = atlasResources.filter(
    (resource) => resource.category === "health" && resource.subcategory === "providers",
  )

  return (
    <article className="container mx-auto flex w-full flex-col gap-6 py-10 md:max-w-3xl">
      <div className="flex flex-col gap-2">
        <h1>Healthcare providers</h1>
        <p>Gender-affirming clinics, hormone therapy, and primary care the community has used and vouched for.</p>
      </div>

      <div className="flex flex-col gap-3.5">
        {resources.map((resource) => (
          <ResourceCard key={resource.id} resource={resource} />
        ))}

        {resources.length === 0 && (
          <div className="flex min-h-16 items-center justify-center rounded-4xl border border-dashed border-border p-5 text-center">
            <p>No providers listed yet.</p>
          </div>
        )}
      </div>
    </article>
  )
}
