import { m } from "@/paraglide/messages"
import { Button } from "@pherus/ui/button"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/(public)/")({
  component: RouteComponent
})

function RouteComponent() {
  return (
    <article className="flex flex-col py-10">
      <section className="container flex flex-col w-full md:max-w-3xl mx-auto">
        <div>
          <h5>{m["nav.title"]()}</h5>
          <h1>Queer knowledge, resources, community, and support.</h1>
          <p>
            A platform by Pherus built for the LGBTQ+ community.
            Discover trusted resources, practical knowledge, opportunities,
            and support shared through queer-to-queer community knowledge.
          </p>
          <Button>Get Started</Button>
        </div>
      </section>
    </article>
  )
}
