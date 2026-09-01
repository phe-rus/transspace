import { Button } from "@pherus/ui/button"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/(public)/")({
  component: RouteComponent
})

function RouteComponent() {
  return (
    <article className="container flex flex-col">
      <section className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <div>
          <h1 className="font-medium">Project ready!</h1>
          <p>You may now add components and start building.</p>
          <p>We&apos;ve already added the button component for you.</p>
          <Button className="mt-2">Button</Button>
        </div>
      </section>
    </article>
  )
}
