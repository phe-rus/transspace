import type { listSupportPosts } from "@/domains/support"
import { supportPostTypeLabel, type SupportPostType } from "@/data/support-types"
import { m } from "@/paraglide/messages"
import { formatDate } from "@/lib/format-date"
import {
  Alert01Icon,
  ChevronRightIcon,
  HandHeartIcon,
  LockIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@pherus/ui/button"
import { Link } from "@tanstack/react-router"

export type SupportPostListItem = Awaited<
  ReturnType<typeof listSupportPosts>
>["items"][number]

export interface SupportPostCardProps {
  post: SupportPostListItem
}

export function SupportPostCard({ post }: SupportPostCardProps) {
  const type = post.type as SupportPostType

  // spec 0005 AC-20: a recurring offer (e.g. a standing "available to
  // talk" listening-ear post) renders as a wide, standing card, carried
  // over from the original support page mockup's recurring offer card
  if (post.isRecurring) {
    return (
      <Link
        to="/support/$postId/details"
        params={{ postId: post.id }}
        className="group flex flex-col gap-4 border-t border-border/60 py-5 sm:flex-row sm:items-center sm:gap-5 md:col-span-2"
      >
        <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-muted">
          <HugeiconsIcon icon={HandHeartIcon} className="size-7" />
        </span>
        <div className="flex flex-1 flex-col gap-1">
          <h6 className="flex items-center gap-1.5 text-muted-foreground">
            {supportPostTypeLabel[type]} · {m["components.supportPostCard.recurring"]()}
          </h6>
          <h3>{post.title}</h3>
        </div>
        <Button
          size="sm"
          className="h-10 shrink-0 rounded-full px-5"
          nativeButton={false}
          render={<span />}
        >
          {m["components.supportPostCard.connect"]()}
        </Button>
      </Link>
    )
  }

  return (
    <Link
      to="/support/$postId/details"
      params={{ postId: post.id }}
      className="group flex flex-col gap-2.5 border-t border-border/60 py-5"
    >
      <div className="flex items-center justify-between">
        {post.isUrgent ? (
          <h6 className="flex items-center gap-1 text-destructive">
            <HugeiconsIcon icon={Alert01Icon} className="size-3" />
            {m["components.supportPostCard.urgent"]()}
          </h6>
        ) : (
          <h6>{supportPostTypeLabel[type]}</h6>
        )}
        <p>{formatDate(post.createdAt)}</p>
      </div>
      <h3>{post.title}</h3>
      {post.visibility === "redacted" && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <HugeiconsIcon icon={LockIcon} className="size-3" />
          {m["pages.support.redactedBody"]()}
        </p>
      )}
      <div className="mt-1 flex items-center justify-end">
        <Button variant="ghost" size="sm" nativeButton={false} render={<span />} className="gap-1 text-foreground">
          {m["components.supportPostCard.viewDetails"]()}
          <HugeiconsIcon icon={ChevronRightIcon} />
        </Button>
      </div>
    </Link>
  )
}
