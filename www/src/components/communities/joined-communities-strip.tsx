import {
  communityIcon,
  communityLabel,
  type CommunitySlug,
} from "@/data/communities"
import { formatRelativeTime } from "@/lib/relative-time"
import { m } from "@/paraglide/messages"
import { getLocale } from "@/paraglide/runtime"
import { HugeiconsIcon } from "@hugeicons/react"
import { Badge } from "@pherus/ui/badge"
import { cn } from "@pherus/ui/lib/utils"
import { ClientOnly, Link } from "@tanstack/react-router"

// the communities this person joined, as circles: the logo, the name
// below, then when it was last active. A live room shows its ring and
// people count here too. Leaving is on each community's own page
export function JoinedCommunitiesStrip({
  communities,
}: {
  communities: {
    slug: CommunitySlug
    lastActivityAt: Date | null
    liveCount: number
  }[]
}) {
  if (communities.length === 0) return null

  return (
    <section className="flex flex-col gap-3">
      <h6>{m["pages.communities.yours"]()}</h6>
      <ul className="no-scrollbar -mx-1 flex list-none gap-4 overflow-x-auto px-1 pt-2 pb-1 ps-1 *:ps-0">
        {communities.map(({ slug, lastActivityAt, liveCount }) => {
          const live = liveCount > 0
          return (
            <li key={slug} className="shrink-0">
              <Link
                to="/communities/$slug"
                params={{ slug }}
                className="group flex w-24 flex-col items-center gap-1 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              >
                <span
                  className={cn(
                    "relative mb-0.5 flex size-16 items-center justify-center rounded-full bg-muted transition-transform group-hover:scale-105",
                    live && "ring-2 ring-success ring-offset-2 ring-offset-background",
                  )}
                >
                  <HugeiconsIcon icon={communityIcon[slug]} className="size-6" />
                  {live && (
                    <Badge className="absolute -top-1 -right-1 min-w-5 justify-center bg-success px-1.5 tabular-nums text-white">
                      {liveCount}
                    </Badge>
                  )}
                </span>
                {/* long names wrap to two lines rather than being cut off */}
                <span className="line-clamp-2 w-full text-center text-xs leading-tight font-medium text-foreground">
                  {communityLabel(slug)}
                </span>
                <span className="w-full truncate text-center text-[0.6875rem] text-muted-foreground">
                  {/* relative to now, so rendered in the browser only */}
                  <ClientOnly>
                    {lastActivityAt
                      ? formatRelativeTime(new Date(lastActivityAt), getLocale())
                      : m["pages.communities.noActivity"]()}
                  </ClientOnly>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
