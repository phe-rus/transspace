import type { LiveSession } from "@/data/live-room"
import { m } from "@/paraglide/messages"
import { cn } from "@pherus/ui/lib/utils"

// everyone in the live, in voice or not: a few small overlapping circles
// with initials, and the total next to them
export function PeopleStack({
  session,
  className,
}: {
  session: Pick<LiveSession, "people" | "faces">
  className?: string
}) {
  if (session.people === 0) return null
  return (
    <span
      className={cn("flex items-center gap-2", className)}
      aria-label={m["pages.communities.bubble.people"]({ count: session.people })}
    >
      <span className="flex -space-x-2" aria-hidden>
        {session.faces.map((face) => (
          <span
            key={face.userLinkId}
            className="flex size-7 items-center justify-center rounded-full bg-muted text-[0.6875rem] font-semibold text-foreground ring-2 ring-background"
          >
            {face.displayName.charAt(0).toUpperCase()}
          </span>
        ))}
      </span>
      <span className="text-sm font-medium tabular-nums text-foreground">
        {session.people}
      </span>
    </span>
  )
}
