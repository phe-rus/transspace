import { formatMessageTime } from "@/components/inbox"
import type { CommunitySlug } from "@/data/communities"
import {
  CHAT_MAX_LENGTH,
  RETENTION_HOURS,
  type RetentionHours,
} from "@/data/live-room"
import { setRoomRetention } from "@/domains/guides"
import { setBlocked } from "@/domains/messages"
import { amIModeratorQueryOptions } from "@/domains/moderators"
import { notifyError, notifySuccess } from "@/lib/toast"
import { m } from "@/paraglide/messages"
import { getLocale } from "@/paraglide/runtime"
import { Call02Icon, MoreHorizontalIcon, SentIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Bubble, BubbleContent } from "@pherus/ui/bubble"
import { Button } from "@pherus/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@pherus/ui/dropdown-menu"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@pherus/ui/empty"
import { cn } from "@pherus/ui/lib/utils"
import {
  Message,
  MessageContent,
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@pherus/ui/select"
import { Textarea } from "@pherus/ui/textarea"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useLiveSession } from "./live-session"
import { PeopleStack } from "./people-stack"
import { VoiceBar } from "./voice-bar"

function retentionLabel(hours: RetentionHours): string {
  switch (hours) {
    case 24:
      return m["pages.communities.live.retention24"]()
    case 168:
      return m["pages.communities.live.retention168"]()
    case 720:
      return m["pages.communities.live.retention720"]()
  }
}


// the Live tab (spec 0010 AC-11 to AC-13, AC-16): the community's text chat
// in real time, with report and block for everyone and removal for
// moderators
export function LiveRoom({ slug }: { slug: CommunitySlug }) {
  const [draft, setDraft] = useState("")
  const { data: moderatorStatus } = useQuery(amIModeratorQueryOptions())
  const isModerator = Boolean(moderatorStatus?.isModerator)

  // the one app wide live connection: entering the tab joins this room,
  // and leaving it keeps the live going (the floating circle takes over)
  const { slug: activeSlug, enter, room, voice } = useLiveSession()
  useEffect(() => {
    enter(slug)
  }, [enter, slug])

  const blockMutation = useMutation({
    mutationFn: async (targetUserLinkId: string) =>
      setBlocked({
        data: {
          targetUserLinkId,
          block: true,
        },
      }),
    onSuccess: (_, targetUserLinkId) => {
      notifySuccess(m["pages.communities.live.blockedToast"]())
      room.hideAuthor(targetUserLinkId)
    },
    onError: notifyError,
  })

  const retentionMutation = useMutation({
    mutationFn: async (hours: RetentionHours) =>
      setRoomRetention({
        data: { slug, hours },
      }),
    onSuccess: ({ hours }) =>
      notifySuccess(
        m["pages.communities.live.retentionSaved"]({ period: retentionLabel(hours) })
      ),
    onError: notifyError,
  })

  function sendDraft() {
    const body = draft.trim()
    if (!body) return
    if (room.send({ type: "chat.send", body })) setDraft("")
  }

  // a live is started and ended, never always on: chat and voice only
  // show while one runs
  const live = Boolean(room.session?.open)
  const you = room.voice?.you
  const canEnd =
    live && (isModerator || (you && room.session?.hostUserLinkId === you))

  const statusText =
    room.status === "open"
      ? live
        ? m["pages.communities.live.startedBy"]({
            name: room.session?.hostName ?? "",
          })
        : m["pages.communities.live.notLiveStatus"]()
      : room.status === "reconnecting"
        ? m["pages.communities.live.reconnecting"]()
        : room.status === "removed"
          ? m["pages.communities.live.removed"]()
          : m["pages.communities.live.connecting"]()

  if (activeSlug !== slug) {
    return (
      <p role="status" className="text-xs text-muted-foreground">
        {m["pages.communities.live.connecting"]()}
      </p>
    )
  }

  return (
    // chat is app chrome, not read content
    <div data-not-typeset className="flex h-[65svh] min-h-96 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5" role="status">
          <span
            className={cn(
              "size-1.5 rounded-full",
              room.status === "open" && live ? "bg-success" : "bg-muted-foreground",
            )}
          />
          {statusText}
        </span>

        {/* everyone in the live, in voice or not */}
        {live && room.session && <PeopleStack session={room.session} />}

        {canEnd && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => room.send({ type: "live.end" })}
            className="ms-auto rounded-full text-destructive"
          >
            {m["pages.communities.live.endLive"]()}
          </Button>
        )}

        {room.retentionHours &&
          (isModerator ? (
            <Select
              value={String(room.retentionHours)}
              onValueChange={(value) =>
                retentionMutation.mutate(Number(value) as RetentionHours)
              }
            >
              <SelectTrigger
                aria-label={m["pages.communities.live.retentionLabel"]()}
                className="h-8 w-fit border-border/35 text-xs"
              >
                <SelectValue>
                  {() =>
                    m["pages.communities.live.retentionNote"]({
                      period: retentionLabel(room.retentionHours!),
                    })
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {RETENTION_HOURS.map((hours) => (
                    <SelectItem key={hours} value={String(hours)}>
                      {retentionLabel(hours)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          ) : (
            <span>
              {m["pages.communities.live.retentionNote"]({
                period: retentionLabel(room.retentionHours),
              })}
            </span>
          ))}
      </div>

      {/* AC-18: a short notice while the free plan guard is on */}
      {room.mode !== "normal" && (
        <p role="status" className="text-xs text-muted-foreground">
          {room.mode === "chatSlowed"
            ? m["pages.communities.live.chatSlowed"]()
            : m["pages.communities.live.voicePaused"]()}
        </p>
      )}

      {live && <VoiceBar room={room} voice={voice} isModerator={isModerator} />}

      <div className="flex min-h-0 flex-1 flex-col">
        {room.status === "open" && room.session && !live ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{m["pages.communities.live.notLiveTitle"]()}</EmptyTitle>
              <EmptyDescription>{m["pages.communities.live.notLiveBody"]()}</EmptyDescription>
            </EmptyHeader>
            <Button onClick={() => room.send({ type: "live.start" })} className="gap-1.5 rounded-full">
              <HugeiconsIcon icon={Call02Icon} />
              {m["pages.communities.live.goLive"]()}
            </Button>
          </Empty>
        ) : room.status === "open" && room.messages.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{m["pages.communities.live.empty"]()}</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <MessageScrollerProvider defaultScrollPosition="end" autoScroll>
            <MessageScroller>
              <MessageScrollerViewport className="no-scrollbar [scrollbar-gutter:auto]">
                <MessageScrollerContent className="gap-3 py-2">
                  {room.messages.map((message, index) => (
                    <MessageScrollerItem
                      key={message.id}
                      messageId={message.id}
                      scrollAnchor={index === room.messages.length - 1}
                    >
                      <Message align={message.mine ? "end" : "start"} className="gap-2 text-sm">
                        <MessageContent>
                          <MessageHeader className="gap-1.5 text-xs">
                            {!message.mine && <span>{message.authorName}</span>}
                            <time dateTime={new Date(message.createdAt).toISOString()}>
                              {formatMessageTime(new Date(message.createdAt), getLocale())}
                            </time>
                          </MessageHeader>
                          <div
                            className={cn(
                              "flex items-start gap-1",
                              message.mine && "flex-row-reverse",
                            )}
                          >
                            <Bubble variant={message.mine ? "tinted" : "muted"} className="max-w-[85%] md:max-w-lg">
                              <BubbleContent className="rounded-3xl px-4 py-2 text-sm whitespace-pre-wrap">
                                {message.body}
                              </BubbleContent>
                            </Bubble>

                            {(!message.mine || isModerator) && (
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  render={
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      aria-label={m["components.comments.moreActions"]()}
                                      className="shrink-0 rounded-full text-muted-foreground"
                                    />
                                  }
                                >
                                  <HugeiconsIcon icon={MoreHorizontalIcon} />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align={message.mine ? "end" : "start"}>
                                  {!message.mine && (
                                    <DropdownMenuItem
                                      onClick={() => room.send({ type: "chat.report", id: message.id })}
                                    >
                                      {m["pages.communities.live.report"]()}
                                    </DropdownMenuItem>
                                  )}
                                  {!message.mine && (
                                    <DropdownMenuItem
                                      onClick={() => blockMutation.mutate(message.authorUserLinkId)}
                                    >
                                      {m["pages.communities.live.block"]()}
                                    </DropdownMenuItem>
                                  )}
                                  {isModerator && (
                                    <DropdownMenuItem
                                      variant="destructive"
                                      onClick={() => room.send({ type: "chat.remove", id: message.id })}
                                    >
                                      {m["pages.communities.live.remove"]()}
                                    </DropdownMenuItem>
                                  )}
                                  {isModerator && !message.mine && (
                                    <DropdownMenuItem
                                      variant="destructive"
                                      onClick={() =>
                                        room.send({
                                          type: "room.removePerson",
                                          userLinkId: message.authorUserLinkId,
                                        })
                                      }
                                    >
                                      {m["pages.communities.live.removePerson"]()}
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </MessageContent>
                      </Message>
                    </MessageScrollerItem>
                  ))}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton />
            </MessageScroller>
          </MessageScrollerProvider>
        )}
      </div>

      {live && (
      <form
        onSubmit={(event) => {
          event.preventDefault()
          sendDraft()
        }}
        className="flex flex-col gap-1.5"
      >
        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              // Enter sends, Shift+Enter starts a new line
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault()
                sendDraft()
              }
            }}
            maxLength={CHAT_MAX_LENGTH}
            rows={1}
            disabled={room.status !== "open"}
            placeholder={m["pages.communities.live.placeholder"]()}
            aria-label={m["pages.communities.live.placeholder"]()}
            className="max-h-32 min-h-11 rounded-3xl px-4 py-3"
          />
          <Button
            type="submit"
            size="icon"
            disabled={room.status !== "open" || !draft.trim()}
            aria-label={m["pages.communities.live.send"]()}
            className="size-11 shrink-0 rounded-full"
          >
            <HugeiconsIcon icon={SentIcon} />
          </Button>
        </div>
        <p className="px-4 text-xs text-muted-foreground">
          {m["pages.communities.live.nameNotice"]()}
        </p>
      </form>
      )}
    </div>
  )
}
