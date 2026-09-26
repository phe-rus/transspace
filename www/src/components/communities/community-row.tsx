import {
  communityIcon,
  communityLabel,
  type CommunitySlug,
} from "@/data/communities"
import { setCommunityJoined } from "@/domains/guides"
import { formatRelativeTime } from "@/lib/relative-time"
import { notifyError, notifySuccess } from "@/lib/toast"
import { m } from "@/paraglide/messages"
import { getLocale } from "@/paraglide/runtime"
import { MoreHorizontalIcon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Badge } from "@pherus/ui/badge"
import { Button } from "@pherus/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@pherus/ui/dropdown-menu"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"

// joining changes what feeds show (spec 0010 AC-2), so the list and the
// home feed are refreshed together
export function useJoinCommunity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { slug: CommunitySlug; joined: boolean }) =>
      setCommunityJoined({
        data: { ...input },
      }),
    onSuccess: (_, input) => {
      notifySuccess(
        input.joined
          ? m["pages.communities.joinedToast"]({ name: communityLabel(input.slug) })
          : m["pages.communities.leftToast"]({ name: communityLabel(input.slug) })
      )
      queryClient.invalidateQueries({ queryKey: ["communities"] })
      queryClient.invalidateQueries({ queryKey: ["threads", "home"] })
    },
    onError: notifyError,
  })
}

// Join, or once joined a quiet "Joined" badge that cannot be tapped by
// mistake; leaving sits behind a small menu so it is always deliberate.
// Shown in a decoy session too, where the server refuses it (spec 0010
// AC-17): hiding it would tell an onlooker the session is a decoy
export function JoinControl({
  slug,
  joined,
}: {
  slug: CommunitySlug
  joined: boolean
}) {
  const join = useJoinCommunity()
  const pending = join.isPending && join.variables?.slug === slug

  if (!joined) {
    return (
      <Button
        size="sm"
        disabled={pending}
        onClick={() => join.mutate({ slug, joined: true })}
        className="shrink-0 rounded-full"
      >
        {m["pages.communities.join"]()}
      </Button>
    )
  }

  return (
    <span className="flex shrink-0 items-center gap-0.5">
      <Badge variant="secondary" className="gap-1 rounded-full px-2.5 py-1">
        <HugeiconsIcon icon={Tick02Icon} className="size-3.5" />
        {m["pages.communities.joined"]()}
      </Badge>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={pending}
              aria-label={m["components.comments.moreActions"]()}
              className="rounded-full text-muted-foreground"
            />
          }
        >
          <HugeiconsIcon icon={MoreHorizontalIcon} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            variant="destructive"
            onClick={() => join.mutate({ slug, joined: false })}
          >
            {m["pages.communities.leave"]()}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
  )
}

// a messages style row (spec 0010 AC-1): icon, name, when it was last
// active, and the join control beside the link, never inside it
export function CommunityRow({
  slug,
  joined,
  lastActivityAt,
  liveCount,
}: {
  slug: CommunitySlug
  joined: boolean
  lastActivityAt: Date | null
  // people in the live room right now (spec 0010 AC-1)
  liveCount: number
}) {
  return (
    <li className="flex items-center gap-3 border-b border-border/60 py-3">
      <Link
        to="/communities/$slug"
        params={{ slug }}
        className="group flex min-w-0 flex-1 items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
          <HugeiconsIcon icon={communityIcon[slug]} className="size-4.5" />
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <h4 className="truncate underline-offset-4 group-hover:underline">
            {communityLabel(slug)}
          </h4>
          <span className="truncate text-xs text-muted-foreground">
            {lastActivityAt
              ? m["pages.communities.lastActive"]({
                  time: formatRelativeTime(new Date(lastActivityAt), getLocale()),
                })
              : m["pages.communities.noActivity"]()}
            {liveCount > 0 && (
              <span className="text-success">
                {" · "}
                {m["pages.communities.liveNow"]({ count: liveCount })}
              </span>
            )}
          </span>
        </span>
      </Link>

      <JoinControl slug={slug} joined={joined} />
    </li>
  )
}
