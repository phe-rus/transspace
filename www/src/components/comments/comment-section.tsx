import {
  COMMENT_MAX_LENGTH,
  deleteComment,
  listCommentsQueryOptions,
  postComment,
  reportComment,
  setBlocked,
  type Comment,
  type CommentContentType,
  type CommentReply,
} from "@/domains/messages"
import { amIModeratorQueryOptions } from "@/domains/moderators"
import { authGateQueryOptions } from "@/lib/auth-gate"
import { formatDate } from "@/lib/format-date"
import { notifyError, notifySuccess } from "@/lib/toast"
import { m } from "@/paraglide/messages"
import { MoreHorizontalIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@pherus/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@pherus/ui/dropdown-menu"
import { Textarea } from "@pherus/ui/textarea"
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useState } from "react"

type Props = {
  contentType: CommentContentType
  contentId: string
}

// spec 0009 step one: the reusable conversation under a story, guide,
// resource, mutual aid post or community thread. Comments are for signed
// in people only (AC-1), so a signed out visitor sees a way in instead
export function CommentSection({ contentType, contentId }: Props) {
  const { data: authGate } = useSuspenseQuery(authGateQueryOptions())

  return (
    <section className="flex flex-col gap-4 border-t border-border/60 pt-6">
      <h2>{m["components.comments.title"]()}</h2>
      {authGate.signedIn ? (
        <SignedInComments contentType={contentType} contentId={contentId} />
      ) : (
        <p>
          <Link to="/auth" className="text-foreground underline underline-offset-4">
            {m["components.comments.signIn"]()}
          </Link>
        </p>
      )}
    </section>
  )
}

function SignedInComments({ contentType, contentId }: Props) {
  const queryClient = useQueryClient()
  const commentsQuery = useQuery(listCommentsQueryOptions(contentType, contentId))
  const { data: moderatorStatus } = useQuery(amIModeratorQueryOptions())
  const canModerate = Boolean(moderatorStatus?.isModerator)
  const [replyTo, setReplyTo] = useState<string | null>(null)

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["comments", contentType, contentId] })

  const postMutation = useMutation({
    mutationFn: async (input: { body: string; parentId?: string }) =>
      postComment({
        data: {
          contentType,
          contentId,
          body: input.body,
          parentId: input.parentId,
        },
      }),
    onSuccess: () => {
      setReplyTo(null)
      refresh()
    },
    onError: notifyError,
  })
  const deleteMutation = useMutation({
    mutationFn: async (id: string) =>
      deleteComment({ data: { id } }),
    onSuccess: () => {
      notifySuccess(m["components.comments.deleteToast"]())
      refresh()
    },
    onError: notifyError,
  })
  const reportMutation = useMutation({
    mutationFn: async (id: string) =>
      reportComment({ data: { id } }),
    onSuccess: () => notifySuccess(m["components.comments.reportToast"]()),
    onError: notifyError,
  })
  const blockMutation = useMutation({
    mutationFn: async (targetUserLinkId: string) =>
      setBlocked({
        data: { targetUserLinkId, block: true },
      }),
    onSuccess: () => {
      notifySuccess(m["components.comments.blockToast"]())
      refresh()
    },
    onError: notifyError,
  })

  const actions: CommentActions = {
    canModerate,
    onReply: (id) => setReplyTo(id),
    onDelete: (id) => deleteMutation.mutate(id),
    onReport: (id) => reportMutation.mutate(id),
    onBlock: (userLinkId) => blockMutation.mutate(userLinkId),
  }
  const comments = commentsQuery.data ?? []

  return (
    <div className="flex flex-col gap-5">
      {commentsQuery.isSuccess && comments.length === 0 && (
        <p>{m["components.comments.empty"]()}</p>
      )}

      <ol className="m-0 flex list-none flex-col ps-0">
        {comments.map((comment: Comment) => (
          <li key={comment.id} className="flex flex-col gap-3 border-t border-border/60 py-4">
            <CommentRow comment={comment} actions={actions} canReply />
            {(comment.replies.length > 0 || replyTo === comment.id) && (
              <ol className="m-0 ml-2 flex list-none flex-col gap-3 border-l border-border/60 ps-4">
                {comment.replies.map((reply) => (
                  <li key={reply.id}>
                    <CommentRow comment={reply} actions={actions} />
                  </li>
                ))}
                {replyTo === comment.id && (
                  <li>
                    <CommentComposer
                      autoFocus
                      placeholder={m["components.comments.replyPlaceholder"]()}
                      pending={postMutation.isPending}
                      onCancel={() => setReplyTo(null)}
                      onSubmit={(body) =>
                        postMutation.mutateAsync({ body, parentId: comment.id })
                      }
                    />
                  </li>
                )}
              </ol>
            )}
          </li>
        ))}
      </ol>

      {/* the box for a new comment sits under the conversation it joins */}
      <div className={comments.length > 0 ? "border-t border-border/60 pt-4" : undefined}>
        <CommentComposer
          placeholder={m["components.comments.placeholder"]()}
          pending={postMutation.isPending && !postMutation.variables?.parentId}
          onSubmit={(body) => postMutation.mutateAsync({ body })}
        />
      </div>
    </div>
  )
}

type CommentActions = {
  canModerate: boolean
  onReply: (id: string) => void
  onDelete: (id: string) => void
  onReport: (id: string) => void
  onBlock: (userLinkId: string) => void
}

function CommentRow({
  comment,
  actions,
  canReply = false,
}: {
  comment: CommentReply
  actions: CommentActions
  canReply?: boolean
}) {
  if (comment.removed) {
    return <p className="italic">{m["components.comments.removed"]()}</p>
  }

  const canDelete = comment.isMine || actions.canModerate
  const authorId = comment.authorUserLinkId

  return (
    <article className="flex flex-col gap-1.5">
      <p className="text-xs">
        <strong className="text-foreground">{comment.authorName}</strong> ·{" "}
        {formatDate(comment.createdAt)}
      </p>
      <p className="whitespace-pre-line text-foreground">{comment.body}</p>
      <div className="flex items-center gap-1">
        {canReply && (
          <Button size="sm" variant="ghost" onClick={() => actions.onReply(comment.id)}>
            {m["components.comments.reply"]()}
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={m["components.comments.moreActions"]()}
              >
                <HugeiconsIcon icon={MoreHorizontalIcon} />
              </Button>
            }
          />
          <DropdownMenuContent align="start">
            {canDelete && (
              <DropdownMenuItem onClick={() => actions.onDelete(comment.id)}>
                {m["components.comments.delete"]()}
              </DropdownMenuItem>
            )}
            {!comment.isMine && (
              <DropdownMenuItem onClick={() => actions.onReport(comment.id)}>
                {m["components.comments.report"]()}
              </DropdownMenuItem>
            )}
            {!comment.isMine && authorId && (
              <DropdownMenuItem onClick={() => actions.onBlock(authorId)}>
                {m["components.comments.block"]()}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  )
}

function CommentComposer({
  placeholder,
  pending,
  onSubmit,
  onCancel,
  autoFocus,
}: {
  placeholder: string
  pending: boolean
  onSubmit: (body: string) => Promise<unknown>
  onCancel?: () => void
  autoFocus?: boolean
}) {
  const [body, setBody] = useState("")
  const trimmed = body.trim()

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={async (event) => {
        event.preventDefault()
        if (!trimmed) return
        try {
          await onSubmit(trimmed)
          setBody("")
        } catch {
          // the mutation already showed the error; keep the text to retry
        }
      }}
    >
      <Textarea
        value={body}
        autoFocus={autoFocus}
        maxLength={COMMENT_MAX_LENGTH}
        onChange={(event) => setBody(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            {m["components.comments.cancel"]()}
          </Button>
        )}
        <Button type="submit" size="sm" className="rounded-full" disabled={!trimmed || pending}>
          {m["components.comments.post"]()}
        </Button>
      </div>
    </form>
  )
}
