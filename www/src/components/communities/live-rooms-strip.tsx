import {
  communityIcon,
  communityLabel,
  type CommunitySlug,
} from "@/data/communities"
import { m } from "@/paraglide/messages"
import { HugeiconsIcon } from "@hugeicons/react"
import { Badge } from "@pherus/ui/badge"
import { Link } from "@tanstack/react-router"

// the live rooms that have people in them right now, as circles: the
// community's logo, a badge with how many people are inside, the name
// below. A tap enters the room's Live tab directly; entering needs no join
// (spec 0010 AC-2: joining only shapes feeds). Busiest first; with no room
// live the strip is not shown at all
export function LiveRoomsStrip({
  rooms,
}: {
  rooms: { slug: CommunitySlug; liveCount: number }[]
}) {
  const live = rooms
    .filter((room) => room.liveCount > 0)
    .sort((a, b) => b.liveCount - a.liveCount)
  if (live.length === 0) return null

  return (
    <section className="flex flex-col gap-3">
      <h6>{m["pages.communities.liveRooms"]()}</h6>
      <ul className="no-scrollbar -mx-1 flex list-none gap-4 overflow-x-auto px-1 pt-2 pb-1 ps-1 *:ps-0">
        {live.map(({ slug, liveCount }) => (
          <li key={slug} className="shrink-0">
            <Link
              to="/communities/$slug"
              params={{ slug }}
              search={{ tab: "live" }}
              aria-label={`${m["pages.communities.enterRoom"]({ name: communityLabel(slug) })}, ${m["pages.communities.liveNow"]({ count: liveCount })}`}
              className="group flex w-20 flex-col items-center gap-1.5 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              {/* the ring reads as "on air" before the number is read */}
              <span className="relative flex size-16 items-center justify-center rounded-full bg-muted ring-2 ring-success ring-offset-2 ring-offset-background transition-transform group-hover:scale-105">
                <HugeiconsIcon icon={communityIcon[slug]} className="size-6" />
                <Badge className="absolute -top-1 -right-1 min-w-5 justify-center bg-success px-1.5 tabular-nums text-white">
                  {liveCount}
                </Badge>
              </span>
              <span className="w-full truncate text-center text-xs text-foreground">
                {communityLabel(slug)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
