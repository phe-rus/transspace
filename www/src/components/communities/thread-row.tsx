import {
  communityIcon,
  communityLabel,
  threadTypeLabel,
} from "@/data/communities"
import type { ThreadListItem } from "@/domains/guides"
import { formatMessageTime } from "@/components/inbox"
import { m } from "@/paraglide/messages"
import { getLocale } from "@/paraglide/runtime"
import { Comment01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { ClientOnly, Link } from "@tanstack/react-router"

// one thread in a list: its kind and writer on top, the title, a one line
// summary, and on the right when it was last active and how many replies
// it has. `showCommunity` is for mixed lists like the home feed
export function ThreadRow({
  thread,
  showCommunity = false,
}: {
  thread: ThreadListItem
  showCommunity?: boolean
}) {
  return (
    <Link
      to="/communities/$slug/threads/$threadId"
      params={{ slug: thread.slug, threadId: thread.id }}
      className="group grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 border-b border-border/60 py-4 outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
    >
      <span className="truncate text-xs text-muted-foreground">
        {[
          showCommunity ? communityLabel(thread.slug) : null,
          threadTypeLabel(thread.threadType),
          thread.contributor ?? m["pages.communities.anonymous"](),
        ]
          .filter(Boolean)
          .join(" · ")}
      </span>
      <time
        dateTime={new Date(thread.lastActivityAt).toISOString()}
        className="text-xs text-muted-foreground tabular-nums"
      >
        {/* a clock time belongs to the reader's timezone, which the server
            rendering this list does not know */}
        <ClientOnly>{formatMessageTime(thread.lastActivityAt, getLocale())}</ClientOnly>
      </time>

      <h4 className="truncate underline-offset-4 group-hover:underline">
        {thread.title}
      </h4>
      <span
        className="flex items-center justify-end gap-1 text-xs text-muted-foreground tabular-nums"
        aria-label={m["pages.communities.replies"]({ count: thread.replyCount })}
      >
        <HugeiconsIcon icon={Comment01Icon} className="size-3.5" />
        {thread.replyCount}
      </span>

      <p className="col-span-2 line-clamp-1">{thread.excerpt}</p>
    </Link>
  )
}

// the same thread as a card, for the home page's sideways scrolling
// "Trending in your communities" row: which community, the title and a
// short summary, then its kind, writer, replies and last activity
export function ThreadCard({ thread }: { thread: ThreadListItem }) {
  return (
    <Link
      to="/communities/$slug/threads/$threadId"
      params={{ slug: thread.slug, threadId: thread.id }}
      className="group flex h-full w-72 flex-col gap-3 rounded-3xl bg-muted/60 p-5 transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30"
    >
      <span className="flex items-center gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background">
          <HugeiconsIcon icon={communityIcon[thread.slug]} className="size-4" />
        </span>
        <span className="truncate text-xs font-medium text-foreground">
          {communityLabel(thread.slug)}
        </span>
      </span>

      <span className="flex flex-1 flex-col gap-1">
        <h4 className="line-clamp-2 underline-offset-4 group-hover:underline">
          {thread.title}
        </h4>
        <p className="line-clamp-3 text-sm">{thread.excerpt}</p>
      </span>

      <span className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="truncate">
          {threadTypeLabel(thread.threadType)} ·{" "}
          {thread.contributor ?? m["pages.communities.anonymous"]()}
        </span>
        <span className="flex shrink-0 items-center gap-2 tabular-nums">
          <span
            className="flex items-center gap-1"
            aria-label={m["pages.communities.replies"]({ count: thread.replyCount })}
          >
            <HugeiconsIcon icon={Comment01Icon} className="size-3.5" />
            {thread.replyCount}
          </span>
          <time dateTime={new Date(thread.lastActivityAt).toISOString()}>
            <ClientOnly>{formatMessageTime(thread.lastActivityAt, getLocale())}</ClientOnly>
          </time>
        </span>
      </span>
    </Link>
  )
}
