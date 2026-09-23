import { ResourceCard } from "@/components/resources/resource-card"
import { atlasResources } from "@/data/atlas-resources"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/(public)/r/health/mental-and-hiv")({
  component: RouteComponent,
})

function RouteComponent() {
  const resources = atlasResources.filter(
    (resource) => resource.category === "health" && resource.subcategory === "mental-and-hiv",
  )

  return (
    <article className="container mx-auto flex w-full flex-col gap-6 py-10 md:max-w-3xl">
      <div className="flex flex-col gap-2">
        <h1>Mental health & HIV</h1>
        <p>Counseling, peer support, and HIV testing and treatment, from services the community trusts.</p>
      </div>

      <div className="flex flex-col gap-3.5">
        {resources.map((resource) => (
          <ResourceCard key={resource.id} resource={resource} />
        ))}

        {resources.length === 0 && (
          <div className="flex min-h-16 items-center justify-center rounded-4xl border border-dashed border-border p-5 text-center">
            <p>No services listed yet.</p>
          </div>
        )}
      </div>
    </article>
  )
}
