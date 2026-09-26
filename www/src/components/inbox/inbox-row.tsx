import { m } from "@/paraglide/messages"
import { countryName } from "@/data/countries"
import { getLocale } from "@/paraglide/runtime"
import { Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Badge } from "@pherus/ui/badge"
import { cn } from "@pherus/ui/lib/utils"
import { Link } from "@tanstack/react-router"
import { InboxAvatar } from "./inbox-avatar"
import {
  formatMessageTime,
  itemStamp,
  snippetText,
  typeLabel,
  type InboxItem,
  type InboxView,
} from "./inbox-item"

// one conversation row. Three states, each said in words as well as weight:
// selected (tinted row, aria-current), unread (semibold, "New" pill) and
// read (regular weight, "Seen" tick). Urgent is a badge ahead of the title
export function InboxRow({
  item,
  view,
  selected,
  read,
}: {
  item: InboxItem
  view: InboxView
  selected: boolean
  read: boolean
}) {
  const stamp = itemStamp(item, view)

  return (
    <Link
      to="/inbox"
      search={(prev) => ({ ...prev, post: item.id })}
      data-selected={selected ? "" : undefined}
      aria-current={selected ? "true" : undefined}
      className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 rounded-2xl px-3 py-3 transition-colors outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/30 data-selected:bg-primary/10"
    >
      <InboxAvatar type={item.type} urgent={item.isUrgent} />

      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-1.5">
          {item.isUrgent && (
            <Badge variant="destructive">
              {m["components.supportPostCard.urgent"]()}
            </Badge>
          )}
          <span className="truncate text-xs text-foreground/70">
            {[
              typeLabel(item.type),
              item.requestorCountryCode
                ? countryName(item.requestorCountryCode, getLocale())
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
        <span
          className={cn(
            "truncate text-sm text-foreground",
            !read && "font-semibold"
          )}
        >
          {item.title}
        </span>
        <span
          className={cn(
            "line-clamp-2 text-xs",
            read ? "text-foreground/70" : "font-medium text-foreground/90"
          )}
        >
          {snippetText(item)}
        </span>
      </div>

      <div className="flex flex-col items-end gap-1">
        <time
          dateTime={new Date(stamp).toISOString()}
          className={cn(
            "text-xs tabular-nums",
            read ? "text-foreground/70" : "font-medium text-foreground"
          )}
        >
          {formatMessageTime(stamp, getLocale())}
        </time>
        {read ? (
          <Badge variant="ghost">
            <HugeiconsIcon icon={Tick02Icon} data-icon="inline-start" />
            {m["pages.supportModeration.readLabel"]()}
          </Badge>
        ) : (
          <Badge>{m["pages.supportModeration.unreadLabel"]()}</Badge>
        )}
      </div>
    </Link>
  )
}
