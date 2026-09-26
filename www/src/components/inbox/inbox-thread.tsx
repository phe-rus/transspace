import { countryName } from "@/data/countries"
import { m } from "@/paraglide/messages"
import { getLocale } from "@/paraglide/runtime"
import {
  Alert01Icon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowUp01Icon,
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  LockIcon,
  Mail01Icon,
  PauseIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Badge } from "@pherus/ui/badge"
import { Preview } from "@pherus/rich-text"
import { Bubble, BubbleContent, BubbleGroup } from "@pherus/ui/bubble"
import { Button, buttonVariants } from "@pherus/ui/button"
import { cn } from "@pherus/ui/lib/utils"
import { Marker, MarkerContent, MarkerIcon } from "@pherus/ui/marker"
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from "@pherus/ui/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@pherus/ui/message-scroller"
import { Field, FieldLabel } from "@pherus/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "@pherus/ui/input-group"
import { Link } from "@tanstack/react-router"
import { useId } from "react"
import { InboxAvatar } from "./inbox-avatar"
import {
  detailEntries,
  idleDays,
  typeLabel,
  type InboxItem,
  type InboxView,
} from "./inbox-item"

// one opened conversation. The header carries where you are in the queue
// (position, previous/next, mark unread); the scroller holds the timeline
// (a dated separator, the requester's post as incoming bubbles, system notes
// as markers); the reply bar is pinned below it. Reject and publish are the
// two ways to answer, like a composer's send
export function InboxThread({
  item,
  view,
  position,
  total,
  onNavigate,
  onMarkUnread,
  reason,
  onReasonChange,
  onPublish,
  onReject,
  onPause,
  busy,
}: {
  item: InboxItem
  view: InboxView
  position: number
  total: number
  onNavigate: (step: -1 | 1) => void
  onMarkUnread: () => void
  reason: string
  onReasonChange: (value: string) => void
  onPublish: () => void
  onReject: () => void
  onPause: () => void
  busy: boolean
}) {
  const locale = getLocale()
  const label = typeLabel(item.type)
  const details = detailEntries(item)
  const shortDetails = details.filter((entry) => entry.kind !== "textarea")
  const longDetails = details.filter((entry) => entry.kind === "textarea")
  const hasReason = reason.trim().length > 0
  const country = item.requestorCountryCode
    ? countryName(item.requestorCountryCode, locale)
    : null
  const visibility = m["pages.supportModeration.visibilityLabel"]({
    tier: item.visibilityTier,
  })
  const sentAt = new Date(item.createdAt)
  const reasonId = useId()

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-2 border-b border-border/35 py-2 md:px-6">
        <Link
          to="/inbox"
          search={(prev) => ({ ...prev, post: undefined })}
          aria-label={m["pages.supportModeration.backToQueue"]()}
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-lg" }),
            "relative after:absolute after:-inset-1.5 md:hidden"
          )}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} />
        </Link>

        <InboxAvatar type={item.type} urgent={item.isUrgent} size="default" />

        <div className="flex min-w-0 flex-1 flex-col">
          <h2 className="truncate text-xs font-semibold">{label}</h2>
          <span className="truncate text-[0.6875rem] text-muted-foreground">
            {country ?? visibility}
          </span>
        </div>

        {item.isUrgent && (
          <Badge variant="destructive" className="hidden md:inline-flex">
            <HugeiconsIcon icon={Alert01Icon} data-icon="inline-start" />
            {m["components.supportPostCard.urgent"]()}
          </Badge>
        )}

        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            className="relative after:absolute after:-inset-1.5"
            disabled={position <= 1}
            onClick={() => onNavigate(-1)}
            aria-label={m["pages.supportModeration.previousMessage"]()}
          >
            <HugeiconsIcon icon={ArrowUp01Icon} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            className="relative after:absolute after:-inset-1.5"
            disabled={position >= total}
            onClick={() => onNavigate(1)}
            aria-label={m["pages.supportModeration.nextMessage"]()}
          >
            <HugeiconsIcon icon={ArrowDown01Icon} />
          </Button>
          <span className="mx-1 hidden text-xs text-muted-foreground tabular-nums md:inline">
            {position} / {total}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="relative after:absolute after:-inset-y-1.5 after:inset-x-0 max-md:size-8 max-md:px-0"
            onClick={onMarkUnread}
            aria-label={m["pages.supportModeration.markUnread"]()}
          >
            <HugeiconsIcon icon={Mail01Icon} data-icon="inline-start" />
            <span className="max-md:sr-only">
              {m["pages.supportModeration.markUnread"]()}
            </span>
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        <MessageScrollerProvider defaultScrollPosition="start">
          <MessageScroller>
            <MessageScrollerViewport className="no-scrollbar [scrollbar-gutter:auto]">
              <MessageScrollerContent className="gap-4 py-6 md:px-6">
                <MessageScrollerItem messageId="submitted">
                  <Marker variant="separator" className="before:bg-border/35 after:bg-border/35">
                    <MarkerContent>
                      <time dateTime={sentAt.toISOString()}>
                        {sentAt.toLocaleString(locale, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </time>
                    </MarkerContent>
                  </Marker>
                </MessageScrollerItem>

                <MessageScrollerItem messageId="post" scrollAnchor>
                  <Message className="gap-2 text-sm">
                    <MessageAvatar>
                      <InboxAvatar
                        type={item.type}
                        urgent={item.isUrgent}
                        size="default"
                      />
                    </MessageAvatar>
                    <MessageContent>
                      <MessageHeader className="text-xs">
                        {[label, country].filter(Boolean).join(" · ")}
                      </MessageHeader>
                      <BubbleGroup>
                        <Bubble variant="muted" className="max-w-full md:max-w-xl">
                          <BubbleContent className="rounded-3xl px-4 py-2.5 text-sm">
                            <strong className="font-semibold text-foreground">
                              {item.title}
                            </strong>
                          </BubbleContent>
                        </Bubble>
                        <Bubble variant="muted" className="max-w-full md:max-w-xl">
                          <BubbleContent className="rounded-3xl px-4 py-3 text-sm">
                            {details.length > 0 ? (
                              <div className="flex flex-col gap-4">
                                {shortDetails.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {shortDetails.map((entry) => (
                                      <Badge
                                        key={entry.label}
                                        variant="outline"
                                        className="h-auto gap-1.5 border-border/35 px-2.5 py-1 text-xs"
                                      >
                                        <span className="font-normal text-muted-foreground">
                                          {entry.label}
                                        </span>
                                        <span
                                          className={cn(
                                            "font-medium text-foreground",
                                            entry.kind === "select" && "capitalize"
                                          )}
                                        >
                                          {entry.value}
                                        </span>
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                                {longDetails.length > 0 && (
                                  <dl className="flex flex-col gap-3">
                                    {longDetails.map((entry) => (
                                      <div
                                        key={entry.label}
                                        className="flex flex-col gap-0.5"
                                      >
                                        <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                          {entry.label}
                                        </dt>
                                        <dd className="text-foreground">
                                          {entry.doc ? (
                                            <Preview content={entry.doc as never} />
                                          ) : (
                                            <span className="whitespace-pre-line">
                                              {entry.value}
                                            </span>
                                          )}
                                        </dd>
                                      </div>
                                    ))}
                                  </dl>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">
                                {m["pages.supportModeration.noDetails"]()}
                              </span>
                            )}
                          </BubbleContent>
                        </Bubble>
                      </BubbleGroup>
                      <MessageFooter className="text-xs">
                        {sentAt.toLocaleTimeString(locale, {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </MessageFooter>
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>

                <MessageScrollerItem messageId="notes">
                  <div className="flex flex-col gap-2">
                    <Marker className="justify-center">
                      <MarkerIcon>
                        <HugeiconsIcon icon={Clock01Icon} />
                      </MarkerIcon>
                      <MarkerContent>
                        {view === "review"
                          ? m["pages.supportModeration.awaitingReview"]()
                          : m["pages.supportModeration.idleNote"]({
                              days: idleDays(item),
                            })}
                      </MarkerContent>
                    </Marker>
                    {item.isUrgent && (
                      <Marker className="justify-center text-destructive">
                        <MarkerIcon>
                          <HugeiconsIcon icon={Alert01Icon} />
                        </MarkerIcon>
                        <MarkerContent>
                          {m["pages.supportModeration.urgentNote"]()}
                        </MarkerContent>
                      </Marker>
                    )}
                    <Marker className="justify-center">
                      <MarkerIcon>
                        <HugeiconsIcon icon={LockIcon} />
                      </MarkerIcon>
                      <MarkerContent>{visibility}</MarkerContent>
                    </Marker>
                  </div>
                </MessageScrollerItem>
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
        </MessageScrollerProvider>
      </div>

      <form
        onSubmit={(event) => event.preventDefault()}
        className="mx-auto w-full flex-none pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:max-w-xl"
      >
        <Field>
          <FieldLabel htmlFor={reasonId} className="sr-only">
            {m["pages.supportModeration.reasonPlaceholder"]()}
          </FieldLabel>
          <InputGroup className="border-border/35 has-[>[data-align=block-end]]:rounded-2xl has-[textarea]:rounded-2xl">
            <InputGroupTextarea
              id={reasonId}
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
              placeholder={m["pages.supportModeration.reasonPlaceholder"]()}
              rows={2}
              className="no-scrollbar max-h-40 min-h-12 px-4 py-3 text-sm md:text-sm"
            />
            <InputGroupAddon align="block-end" className="justify-end gap-2 px-3 pb-3">
              {view === "review" ? (
                <>
                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    className="rounded-full px-4"
                    disabled={!hasReason || busy}
                    onClick={onReject}
                  >
                    <HugeiconsIcon icon={CancelCircleIcon} data-icon="inline-start" />
                    {m["pages.supportModeration.reject"]()}
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    className="rounded-full px-4"
                    disabled={busy}
                    onClick={onPublish}
                  >
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} data-icon="inline-start" />
                    {m["pages.supportModeration.publish"]()}
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  className="rounded-full px-4"
                  disabled={!hasReason || busy}
                  onClick={onPause}
                >
                  <HugeiconsIcon icon={PauseIcon} data-icon="inline-start" />
                  {m["pages.supportModeration.pause"]()}
                </Button>
              )}
            </InputGroupAddon>
          </InputGroup>
        </Field>
      </form>
    </section>
  )
}
