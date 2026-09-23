import type { MutualAidPost } from "@/data/mutual-aid-posts"
import { Alert01Icon, ChevronRightIcon, HandHeartIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@pherus/ui/button"

export interface MutualAidCardProps {
  post: MutualAidPost
}

export function MutualAidCard({ post }: MutualAidCardProps) {
  if (post.category === "offer") {
    return (
      <article className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 transition-colors hover:bg-muted sm:flex-row sm:items-center sm:gap-5 md:col-span-2">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-background">
          <HugeiconsIcon icon={HandHeartIcon} className="size-7" />
        </span>
        <div className="flex flex-1 flex-col gap-1">
          <h6>{post.categoryLabel}</h6>
          <h3>{post.title}</h3>
          <p>{post.description}</p>
        </div>
        <Button disabled className="h-10 shrink-0 rounded-full px-5">
          Connect
        </Button>
      </article>
    )
  }

  return (
    <article className="flex flex-col gap-2.5 rounded-3xl border border-border bg-card p-5 transition-colors hover:bg-muted">
      <div className="flex items-center justify-between">
        {post.category === "urgent" ? (
          <h6 className="flex items-center gap-1 text-destructive">
            <HugeiconsIcon icon={Alert01Icon} className="size-3" />
            {post.categoryLabel}
          </h6>
        ) : (
          <h6>{post.categoryLabel}</h6>
        )}
        <p>{post.postedAt}</p>
      </div>
      <h3>{post.title}</h3>
      <p>{post.description}</p>
      <div className="mt-1 flex items-center justify-between">
        <p>{post.posterName}</p>
        <Button variant="ghost" size="sm" disabled className="gap-1 text-foreground">
          Respond
          <HugeiconsIcon icon={ChevronRightIcon} />
        </Button>
      </div>
    </article>
  )
}
