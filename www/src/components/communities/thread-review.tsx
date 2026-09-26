import { formatMessageTime } from "@/components/inbox"
import {
  communityIcon,
  communityLabel,
  isHealthCommunity,
  threadTypeLabel,
  type CommunitySlug,
  type ThreadType,
} from "@/data/communities"
import { m } from "@/paraglide/messages"
import { getLocale } from "@/paraglide/runtime"
import { ArrowLeft01Icon, InformationCircleIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Preview } from "@pherus/rich-text"
import { Button } from "@pherus/ui/button"
import { Link } from "@tanstack/react-router"

export type PendingThread = {
  id: string
  slug: CommunitySlug
  title: string
  excerpt: string
  threadType: ThreadType
  bodyContent: string
  contributor: string | null
  createdAt: Date
}

// one pending thread in the inbox list, the same shape as a support post
// row: community icon, kind and community, title, a one line summary
export function PendingThreadRow({
  thread,
  selected,
}: {
  thread: PendingThread
  selected: boolean
}) {
  return (
    <Link
      to="/inbox"
      search={(prev) => ({ ...prev, post: thread.id })}
      data-selected={selected ? "" : undefined}
      aria-current={selected ? "true" : undefined}
      className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 rounded-2xl px-3 py-3 transition-colors outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/30 data-selected:bg-primary/10"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
        <HugeiconsIcon icon={communityIcon[thread.slug]} className="size-4.5" />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-xs text-foreground/70">
          {`${threadTypeLabel(thread.threadType)} · ${communityLabel(thread.slug)}`}
        </span>
        <span className="truncate text-sm font-semibold text-foreground">
          {thread.title}
        </span>
        <span className="truncate text-sm text-muted-foreground">
          {thread.excerpt}
        </span>
      </div>
      <time className="self-start text-xs text-muted-foreground tabular-nums">
        {formatMessageTime(thread.createdAt, getLocale())}
      </time>
    </Link>
  )
}

// the review pane: the whole thread as readers would see it, then approve
// or reject, the same outcomes as a story (spec 0010 AC-5)
export function ThreadReviewPane({
  thread,
  busy,
  onApprove,
  onReject,
}: {
  thread: PendingThread
  busy: boolean
  onApprove: () => void
  onReject: () => void
}) {
  let bodyContent: unknown
  try {
    bodyContent = JSON.parse(thread.bodyContent)
  } catch {
    bodyContent = null
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="no-scrollbar flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1 py-4 md:px-6">
        <Link
          to="/inbox"
          search={(prev) => ({ ...prev, post: undefined })}
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground md:hidden"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3.5" />
          {m["pages.supportModeration.backToQueue"]()}
        </Link>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">
            {[
              communityLabel(thread.slug),
              threadTypeLabel(thread.threadType),
              thread.contributor ?? m["pages.supportModeration.anonymousAuthor"](),
            ].join(" · ")}
          </span>
          <h2>{thread.title}</h2>
          <p>{thread.excerpt}</p>
        </div>

        {isHealthCommunity(thread.slug) && (
          <p className="flex items-start gap-2 text-foreground">
            <HugeiconsIcon icon={InformationCircleIcon} className="mt-0.5 size-4 shrink-0" />
            {m["pages.communities.healthNotice"]()}
          </p>
        )}

        {bodyContent ? <Preview content={bodyContent as never} /> : null}
      </div>

      <div className="flex gap-2 border-t border-border/35 px-1 py-3 md:px-6">
        <Button disabled={busy} onClick={onApprove} className="rounded-full">
          {m["pages.supportModeration.publish"]()}
        </Button>
        <Button
          variant="outline"
          disabled={busy}
          onClick={onReject}
          className="rounded-full"
        >
          {m["pages.supportModeration.reject"]()}
        </Button>
      </div>
    </div>
  )
}
