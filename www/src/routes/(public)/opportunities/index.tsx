import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/(public)/opportunities")({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="container mx-auto flex min-h-[50vh] items-center justify-center py-10 text-center text-muted-foreground">
      <p>Opportunities is coming soon.</p>
    </div>
  )
}
