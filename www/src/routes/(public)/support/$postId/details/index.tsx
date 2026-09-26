import {
  assignClaim,
  createClaim,
  declineClaim,
  fulfillSupportPost,
  getSupportPostQueryOptions,
  listSupportClaimsQueryOptions,
  postSupportUpdate,
  withdrawSupportPost,
} from "@/domains/support"
import { CommentSection } from "@/components/comments/comment-section"
import { detailEntries, formatMoney } from "@/components/inbox/inbox-item"
import { supportPostTypeLabel, type SupportPostType } from "@/data/support-types"
import { authGateQueryOptions } from "@/lib/auth-gate"
import { notifyError, notifySuccess } from "@/lib/toast"
import { m } from "@/paraglide/messages"
import {
  Alert01Icon,
  ArrowLeft01Icon,
  CheckmarkCircle01Icon,
  Shield01Icon,
  UserGroup02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Preview } from "@pherus/rich-text"
import { Button } from "@pherus/ui/button"
import { Input } from "@pherus/ui/input"
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { Link, createFileRoute } from "@tanstack/react-router"
import { useState } from "react"

export const Route = createFileRoute("/(public)/support/$postId/details/")({
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.query({
        ...getSupportPostQueryOptions(params.postId),
        staleTime: "static",
      }),
      context.queryClient.query({
        ...authGateQueryOptions(),
        staleTime: "static",
      }),
    ]),
  component: RouteComponent,
})

const STATUS_LABEL_KEY: Record<string, string> = {
  pending: "pages.supportDetail.statusPending",
  published: "pages.supportDetail.statusPublished",
  paused: "pages.supportDetail.statusPaused",
  fulfilled: "pages.supportDetail.statusFulfilled",
  withdrawn: "pages.supportDetail.statusWithdrawn",
  rejected: "pages.supportDetail.statusRejected",
}

function messageByKey(key: string): string {
  return (m as unknown as Record<string, () => string>)[key]()
}

function RouteComponent() {
  const { postId } = Route.useParams()
  const queryClient = useQueryClient()
  const { data: post } = useSuspenseQuery(getSupportPostQueryOptions(postId))
  const { data: authGate } = useSuspenseQuery(authGateQueryOptions())
  const [progressAmount, setProgressAmount] = useState("")

  const isAuthorOrModerator = post?.visibility === "full" && "updates" in post && post.updates !== null

  const { data: claims } = useQuery({
    ...listSupportClaimsQueryOptions(postId),
    enabled: Boolean(isAuthorOrModerator),
  })

  const claimMutation = useMutation({
    mutationFn: createClaim,
    onSuccess: () => {
      notifySuccess(m["pages.supportDetail.claimToast"]())
      queryClient.invalidateQueries({ queryKey: ["support-post", postId] })
    },
    onError: notifyError,
  })
  const assignMutation = useMutation({
    mutationFn: assignClaim,
    onSuccess: () => {
      notifySuccess(m["pages.supportDetail.assignToast"]())
      queryClient.invalidateQueries({ queryKey: ["support-claims", postId] })
    },
    onError: notifyError,
  })
  const declineMutation = useMutation({
    mutationFn: declineClaim,
    onSuccess: () => {
      notifySuccess(m["pages.supportDetail.declineToast"]())
      queryClient.invalidateQueries({ queryKey: ["support-claims", postId] })
    },
    onError: notifyError,
  })
  const withdrawMutation = useMutation({
    mutationFn: withdrawSupportPost,
    onSuccess: () => {
      notifySuccess(m["pages.supportDetail.withdrawToast"]())
      queryClient.invalidateQueries({ queryKey: ["support-post", postId] })
    },
    onError: notifyError,
  })
  const fulfillMutation = useMutation({
    mutationFn: fulfillSupportPost,
    onSuccess: () => {
      notifySuccess(m["pages.supportDetail.fulfillToast"]())
      queryClient.invalidateQueries({ queryKey: ["support-post", postId] })
    },
    onError: notifyError,
  })
  const progressMutation = useMutation({
    mutationFn: postSupportUpdate,
    onSuccess: () => {
      notifySuccess(m["pages.supportDetail.progressUpdateToast"]())
      setProgressAmount("")
      queryClient.invalidateQueries({ queryKey: ["support-post", postId] })
    },
    onError: notifyError,
  })

  if (!post) {
    return (
      <article className="container mx-auto flex min-h-[50vh] w-full flex-col items-center justify-center gap-3 py-10 text-center md:max-w-5xl">
        <h1>{m["pages.supportDetail.notFoundTitle"]()}</h1>
        <p>{m["pages.supportDetail.notFoundBody"]()}</p>
        <Button variant="outline" nativeButton={false} render={<Link to="/support" />} className="rounded-full">
          {m["pages.supportDetail.backToSupport"]()}
        </Button>
      </article>
    )
  }

  if (post.visibility === "locked") {
    return (
      <article className="container mx-auto flex min-h-[50vh] w-full flex-col items-center justify-center gap-3 py-10 text-center md:max-w-5xl">
        <h1>{m["pages.supportDetail.lockedTitle"]()}</h1>
        <p>{m["pages.supportDetail.lockedBody"]()}</p>
        <Button nativeButton={false} render={<Link to="/auth" />} className="rounded-full">
          {m["pages.submitSupport.signIn"]()}
        </Button>
      </article>
    )
  }

  const backLink = (
    <Link to="/support" className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground">
      <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3.5" />
      {m["pages.supportDetail.backToSupport"]()}
    </Link>
  )

  if (post.visibility === "redacted") {
    return (
      <article className="container mx-auto flex w-full flex-col gap-6 py-10 md:max-w-5xl">
        <div className="flex w-full flex-col gap-6 md:max-w-xl">
          {backLink}
          <h1>{post.title}</h1>
          <p>{m["pages.support.redactedBody"]()}</p>
          <Button nativeButton={false} render={<Link to="/auth" />} className="w-fit rounded-full">
            {m["pages.submitSupport.signIn"]()}
          </Button>
        </div>
      </article>
    )
  }

  const type = post.type as SupportPostType
  const details = post.structuredDetails as Record<string, unknown>
  const entries = detailEntries(post)
  const currency = typeof details.currency === "string" ? details.currency : ""
  const money = (amount: unknown) =>
    (typeof amount === "number" && formatMoney(amount, currency)) ||
    `${String(amount ?? "")} ${currency}`.trim()
  const canManage = Boolean(claims)
  const isOpen = post.status === "published"

  return (
    <article className="container mx-auto flex w-full flex-col gap-6 py-10 md:max-w-5xl">
      <div className="flex w-full flex-col gap-6 md:max-w-xl">
      {backLink}

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <h6>{supportPostTypeLabel[type]}</h6>
          {post.isUrgent && (
            <h6 className="flex items-center gap-1 text-destructive">
              <HugeiconsIcon icon={Alert01Icon} className="size-3" />
              {m["components.supportPostCard.urgent"]()}
            </h6>
          )}
          {post.isRecurring && (
            <h6 className="text-muted-foreground">
              {m["components.supportPostCard.recurring"]()}
            </h6>
          )}
          <h6>{messageByKey(STATUS_LABEL_KEY[post.status] ?? "pages.supportDetail.statusPending")}</h6>
          {post.authorIsModerator && (
            <h6 className="text-muted-foreground">
              {m["pages.supportDetail.postedByModerator"]()}
            </h6>
          )}
          {post.trust?.communityReviewed && (
            <h6 className="flex items-center gap-1 text-success">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} className="size-3" />
              {m["pages.supportDetail.communityReviewed"]()}
            </h6>
          )}
          {post.trust?.professionalVerified && (
            <h6 className="flex items-center gap-1 text-success">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} className="size-3" />
              {m["pages.supportDetail.professionalVerified"]()}
            </h6>
          )}
        </div>
        <h1>{post.title}</h1>
      </div>

      <div className="flex flex-col gap-3">
        {entries.map((entry) =>
          entry.kind === "textarea" ? (
            <div key={entry.label} className="flex flex-col gap-1">
              <strong className="text-foreground">{entry.label}</strong>
              {entry.doc ? (
                <Preview content={entry.doc as never} />
              ) : (
                <p>{entry.value}</p>
              )}
            </div>
          ) : (
            <p key={entry.label}>
              <strong className="text-foreground">{entry.label}: </strong>
              {entry.value}
            </p>
          )
        )}
      </div>

      {type === "request_financial" && (
        <div className="flex flex-col gap-1 border-t border-border/60 pt-5">
          <p>
            {money(post.raisedAmount ?? 0)} / {money(details.targetAmount)}
          </p>
          <p className="text-xs text-muted-foreground">
            {m["pages.supportDetail.selfReportedNote"]()}
          </p>
        </div>
      )}

      {authGate.signedIn && isOpen && (
        <div className="flex flex-wrap gap-2.5">
          <Button
            className="rounded-full"
            disabled={claimMutation.isPending}
            onClick={async () => {
              claimMutation.mutate({ data: { id: postId } })
            }}
          >
            {claimMutation.isSuccess
              ? m["pages.supportDetail.claimSent"]()
              : m["pages.supportDetail.expressInterest"]()}
          </Button>
        </div>
      )}

      {canManage && (
        <div className="flex flex-col gap-3">
          <h2>{m["pages.supportDetail.interestedHelpers"]()}</h2>
          <div className="flex flex-col">
            {claims?.map((claim) => (
              <div
                key={claim.id}
                className="flex items-center justify-between gap-2 border-t border-border/60 py-3"
              >
                <p className="flex items-center gap-1.5">
                  <HugeiconsIcon icon={UserGroup02Icon} className="size-3.5" />
                  {claim.helperDisplayName ?? claim.helperUserLinkId}
                </p>
                <div className="flex items-center gap-1.5">
                  {claim.status === "assigned" ? (
                    <span className="text-xs text-success">
                      {m["pages.supportDetail.assigned"]()}
                    </span>
                  ) : claim.status === "interested" ? (
                    <>
                      <Button
                        size="sm"
                        className="rounded-full"
                        disabled={assignMutation.isPending}
                        onClick={async () => {
                          assignMutation.mutate({
                            data: { id: postId, claimId: claim.id },
                          })
                        }}
                      >
                        {m["pages.supportDetail.assign"]()}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        disabled={declineMutation.isPending}
                        onClick={async () => {
                          declineMutation.mutate({
                            data: { id: postId, claimId: claim.id },
                          })
                        }}
                      >
                        {m["pages.supportDetail.decline"]()}
                      </Button>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">{claim.status}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {type === "request_financial" && (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={progressAmount}
                onChange={(event) => setProgressAmount(event.target.value)}
                placeholder={m["pages.supportDetail.progressAmountLabel"]()}
                className="w-full max-w-40"
              />
              <Button
                size="sm"
                className="rounded-full"
                disabled={!progressAmount || progressMutation.isPending}
                onClick={async () => {
                  progressMutation.mutate({
                    data: {
                      id: postId,
                      kind: "progress",
                      amount: Number(progressAmount),
                    },
                  })
                }}
              >
                {m["pages.supportDetail.postUpdate"]()}
              </Button>
            </div>
          )}

          {isOpen && (
            <div className="flex gap-2.5">
              <Button
                variant="outline"
                className="rounded-full"
                disabled={fulfillMutation.isPending}
                onClick={async () => {
                  fulfillMutation.mutate({ data: { id: postId } })
                }}
              >
                {m["pages.supportDetail.markFulfilled"]()}
              </Button>
              <Button
                variant="outline"
                className="rounded-full"
                disabled={withdrawMutation.isPending}
                onClick={async () => {
                  withdrawMutation.mutate({ data: { id: postId } })
                }}
              >
                {m["pages.supportDetail.withdrawPost"]()}
              </Button>
            </div>
          )}
        </div>
      )}

      {post.status === "published" && post.visibilityTier !== "private" && (
        <CommentSection contentType="supportPost" contentId={postId} />
      )}

      <div className="flex items-center gap-3 border-t border-border/60 pt-5">
        <HugeiconsIcon icon={Shield01Icon} className="size-4.5 shrink-0" />
        <p>
          <strong className="text-foreground">{m["pages.support.privacyNoteStrong"]()}</strong>{" "}
          {m["pages.support.privacyNote"]()}
        </p>
      </div>
      </div>
    </article>
  )
}
