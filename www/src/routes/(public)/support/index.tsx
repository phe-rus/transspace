import { MutualAidCard } from "@/components/support/mutual-aid-card"
import { mutualAidPosts } from "@/data/mutual-aid-posts"
import { Add01Icon, Alert01Icon, FilterHorizontalIcon, HeartHandshakeIcon, Shield01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@pherus/ui/button"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/(public)/support/")({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <article className="container mx-auto flex w-full flex-col gap-6 py-10 md:max-w-5xl">
      <div className="flex flex-col gap-3">
        {/* data-not-typeset: status pill is app chrome, not page content */}
        <div
          data-not-typeset
          className="flex w-fit items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-3 py-1.5 text-xs! text-warning"
        >
          <HugeiconsIcon icon={Alert01Icon} className="size-3" />
          Exploratory concept, not part of this build yet
        </div>
        <h1>Mutual aid</h1>
        <p className="max-w-lg">
          A space for collective care. Request what you need, or share what you can, with complete privacy.
        </p>
      </div>

      <div className="flex flex-wrap gap-2.5">
        <Button disabled className="h-10 gap-1.5 rounded-full px-5">
          <HugeiconsIcon icon={Add01Icon} />
          Request help
        </Button>
        <Button variant="outline" disabled className="h-10 gap-1.5 rounded-full px-5">
          <HugeiconsIcon icon={HeartHandshakeIcon} />
          Offer support
        </Button>
        <Button variant="outline" disabled className="h-10 gap-1.5 rounded-full px-5">
          <HugeiconsIcon icon={FilterHorizontalIcon} />
          Filters
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
        {mutualAidPosts.map((post) => (
          <MutualAidCard key={post.id} post={post} />
        ))}
      </div>

      <div className="flex items-center gap-3 rounded-3xl border border-border p-5">
        <HugeiconsIcon icon={Shield01Icon} className="size-4.5 shrink-0" />
        <p>
          <strong className="text-foreground">Your identity is protected.</strong> Only your pseudonymous display
          name is shown here, never your real name or exact location.
        </p>
      </div>
    </article>
  )
}
