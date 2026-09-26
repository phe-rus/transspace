import {
  dayBucket,
  InboxRow,
  InboxThread,
  itemStamp,
  matchesQuery,
  useInboxRead,
  type DayBucket,
  type InboxItem,
} from "@/components/inbox"
import {
  PendingThreadRow,
  ThreadReviewPane,
} from "@/components/communities"
import { countryName } from "@/data/countries"
import { amIModeratorQueryOptions } from "@/domains/moderators"
import {
  listPendingThreadsQueryOptions,
  publishGuide,
  rejectGuide,
} from "@/domains/guides"
import {
  listStaleSupportPostsQueryOptions,
  listSupportPostsQueryOptions,
  pauseSupportPost,
  publishSupportPost,
  rejectSupportPost,
} from "@/domains/support"
import { notifyError, notifySuccess } from "@/lib/toast"
import { m } from "@/paraglide/messages"
import { getLocale } from "@/paraglide/runtime"
import { MessageIcon, Search01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Badge } from "@pherus/ui/badge"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@pherus/ui/empty"
import { cn } from "@pherus/ui/lib/utils"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@pherus/ui/input-group"
import { Marker, MarkerContent } from "@pherus/ui/marker"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@pherus/ui/select"
import { Skeleton } from "@pherus/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@pherus/ui/tabs"
import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useState } from "react"

export const Route = createFileRoute("/(public)/inbox/")({
  validateSearch: (
    search: Record<string, unknown>
  ): { view?: "checkin" | "threads"; post?: string } => ({
    ...(search.view === "checkin" || search.view === "threads"
      ? { view: search.view }
      : {}),
    ...(typeof search.post === "string" ? { post: search.post } : {}),
  }),
  component: RouteComponent,
})

function RouteComponent() {
  const { view: viewParam, post: postId } = Route.useSearch()
  const view = viewParam ?? "review"
  const navigate = Route.useNavigate()

  const { data: moderatorStatus } = useSuspenseQuery(amIModeratorQueryOptions())
  const myCountry = moderatorStatus.countryCode

  // defaults to the moderator's own country when they have one (spec
  // decision: "soft filter first pass"), otherwise there's no "mine" to
  // default to, so it opens on everything
  const [scope, setScope] = useState<"mine" | "general" | "all">(
    myCountry ? "mine" : "all"
  )
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [query, setQuery] = useState("")
  const { readIds, ready, markRead, markUnread } = useInboxRead()
  const queryClient = useQueryClient()

  const pendingQuery = useQuery(
    listSupportPostsQueryOptions({
      status: "pending",
      countryCode: scope === "mine" && myCountry ? myCountry : undefined,
    })
  )
  const staleQuery = useQuery(listStaleSupportPostsQueryOptions())
  // pending community threads (spec 0010 AC-5), reviewed like a story
  const threadsQuery = useQuery(listPendingThreadsQueryOptions())

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["support-posts"] })
    queryClient.invalidateQueries({ queryKey: ["support-posts-stale"] })
    queryClient.invalidateQueries({
      queryKey: ["support-posts-pending-count"],
    })
  }

  // the answered message leaves the list, so the thread closes with it
  const closeThread = () =>
    navigate({ search: (prev) => ({ ...prev, post: undefined }), replace: true })

  const publishMutation = useMutation({
    mutationFn: publishSupportPost,
    onSuccess: () => {
      notifySuccess(m["pages.supportModeration.publishedToast"]())
      invalidate()
      closeThread()
    },
    onError: notifyError,
  })
  const rejectMutation = useMutation({
    mutationFn: rejectSupportPost,
    onSuccess: () => {
      notifySuccess(m["pages.supportModeration.rejectedToast"]())
      invalidate()
      closeThread()
    },
    onError: notifyError,
  })
  const threadOutcome = (toast: string) => () => {
    notifySuccess(toast)
    queryClient.invalidateQueries({ queryKey: ["threads"] })
    queryClient.invalidateQueries({ queryKey: ["communities"] })
    closeThread()
  }
  const approveThreadMutation = useMutation({
    mutationFn: publishGuide,
    onSuccess: threadOutcome(m["pages.supportModeration.threadApprovedToast"]()),
    onError: notifyError,
  })
  const rejectThreadMutation = useMutation({
    mutationFn: rejectGuide,
    onSuccess: threadOutcome(m["pages.supportModeration.threadRejectedToast"]()),
    onError: notifyError,
  })
  const pauseMutation = useMutation({
    mutationFn: pauseSupportPost,
    onSuccess: () => {
      notifySuccess(m["pages.supportModeration.pausedToast"]())
      invalidate()
      closeThread()
    },
    onError: notifyError,
  })

  const pendingRaw = (pendingQuery.data?.items ?? []) as unknown as InboxItem[]
  // "general" scope is a client-side narrowing of the same page (the
  // server's soft country filter already handles "mine", see
  // listSupportPosts): posts with no declared country, kept for older
  // rows written before this column existed
  const pendingItems =
    scope === "general"
      ? pendingRaw.filter((item) => !item.requestorCountryCode)
      : pendingRaw
  const staleItems = (staleQuery.data ?? []) as unknown as InboxItem[]

  const pendingThreads = threadsQuery.data ?? []
  const needle = query.trim().toLowerCase()
  const visibleThreads = pendingThreads.filter((thread) =>
    `${thread.title} ${thread.excerpt}`.toLowerCase().includes(needle)
  )
  const selectedThread =
    view === "threads"
      ? (visibleThreads.find((thread) => thread.id === postId) ?? null)
      : null

  const listQuery = view === "checkin" ? staleQuery : pendingQuery
  const items =
    view === "threads" ? [] : view === "checkin" ? staleItems : pendingItems
  // nothing is selected until the moderator picks a message, the same way a
  // messaging app opens on its list
  const visible = items.filter((item) => matchesQuery(item, query))
  const selected = visible.find((item) => item.id === postId) ?? null
  const reason = selected ? (reasons[selected.id] ?? "") : ""
  const selectedIndex = selected ? visible.indexOf(selected) : -1
  const unreadCount = items.filter((item) => !readIds.has(item.id)).length

  // opening a message is what reads it
  const selectedId = selected?.id
  useEffect(() => {
    if (ready && selectedId) markRead(selectedId)
  }, [ready, selectedId, markRead])

  function openMessage(id: string) {
    navigate({ search: (prev) => ({ ...prev, post: id }) })
  }

  const bucketLabel = (bucket: DayBucket) =>
    bucket === "today"
      ? m["pages.supportModeration.bucketToday"]()
      : bucket === "yesterday"
        ? m["pages.supportModeration.bucketYesterday"]()
        : bucket === "week"
          ? m["pages.supportModeration.bucketWeek"]()
          : m["pages.supportModeration.bucketEarlier"]()
  const busy =
    publishMutation.isPending ||
    rejectMutation.isPending ||
    pauseMutation.isPending ||
    approveThreadMutation.isPending ||
    rejectThreadMutation.isPending
  const hasSelection = Boolean(selected ?? selectedThread)

  return (
    // the inbox is app chrome (a messaging shell), not read content, so the
    // whole subtree opts out of typeset
    <div
      data-not-typeset
      data-posture="dense"
      className="container w-full mx-auto grid h-[calc(100svh-2.75rem)] grid-cols-1 grid-rows-[minmax(0,1fr)] md:grid-cols-[20rem_1fr] lg:grid-cols-[24rem_1fr]"
    >
      <aside
        className={cn(
          "flex min-h-0 flex-col md:border-r md:border-border/35 md:pr-3",
          hasSelection && "hidden md:flex"
        )}
      >
        <div className="flex flex-col gap-3 pt-4 pb-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-lg font-semibold">
                {m["pages.supportModeration.title"]()}
              </h1>
              {unreadCount > 0 && (
                <Badge className="tabular-nums">
                  {m["pages.supportModeration.unreadCount"]({
                    count: unreadCount,
                  })}
                </Badge>
              )}
            </div>

            {view === "review" && (
              <Select
                value={scope}
                onValueChange={(value) => setScope(value as typeof scope)}
              >
                <SelectTrigger className="w-fit max-w-44 border-border/35">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                  {myCountry && (
                    <SelectItem value="mine">
                      {m["pages.supportModeration.scopeMine"]({
                        country: countryName(myCountry, getLocale()),
                      })}
                    </SelectItem>
                  )}
                  <SelectItem value="general">
                    {m["pages.supportModeration.scopeGeneral"]()}
                  </SelectItem>
                  <SelectItem value="all">
                    {m["pages.supportModeration.scopeAll"]()}
                  </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          </div>

          <Tabs
            value={view}
            className='px-0'
            onValueChange={(value) =>
              navigate({
                search: (prev) => ({
                  ...prev,
                  view:
                    value === "checkin" || value === "threads"
                      ? value
                      : undefined,
                  post: undefined,
                }),
              })
            }
          >
            <TabsList variant="line" className="w-fit gap-2 px-0">
              <TabsTrigger value="review" className="gap-2 px-0">
                {m["pages.supportModeration.pendingTab"]()}
                {pendingQuery.isSuccess && (
                  <Badge
                    variant={view === "review" ? "default" : "secondary"}
                    className="tabular-nums"
                  >
                    {pendingItems.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="checkin" className="gap-2 px-0">
                {m["pages.supportModeration.staleTab"]()}
                {staleQuery.isSuccess && (
                  <Badge
                    variant={view === "checkin" ? "default" : "secondary"}
                    className="tabular-nums"
                  >
                    {staleItems.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="threads" className="gap-2 px-0">
                {m["pages.supportModeration.threadsTab"]()}
                {threadsQuery.isSuccess && (
                  <Badge
                    variant={view === "threads" ? "default" : "secondary"}
                    className="tabular-nums"
                  >
                    {pendingThreads.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <InputGroup className="h-9 rounded-full border-border/35">
            <InputGroupAddon>
              <HugeiconsIcon icon={Search01Icon} />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={m["pages.supportModeration.searchPlaceholder"]()}
              aria-label={m["pages.supportModeration.searchPlaceholder"]()}
            />
          </InputGroup>
        </div>

        <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto pb-4">
          {view === "threads" ? (
            threadsQuery.isSuccess && visibleThreads.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <HugeiconsIcon icon={MessageIcon} />
                  </EmptyMedia>
                  <EmptyTitle>
                    {pendingThreads.length === 0
                      ? m["pages.supportModeration.threadsEmpty"]()
                      : m["pages.supportModeration.noResults"]()}
                  </EmptyTitle>
                </EmptyHeader>
              </Empty>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {visibleThreads.map((thread) => (
                  <li key={thread.id}>
                    <PendingThreadRow
                      thread={thread}
                      selected={thread.id === selectedThread?.id}
                    />
                  </li>
                ))}
              </ul>
            )
          ) : listQuery.isSuccess && visible.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <HugeiconsIcon icon={MessageIcon} />
                </EmptyMedia>
                <EmptyTitle>
                  {items.length === 0
                    ? m["pages.supportModeration.empty"]()
                    : m["pages.supportModeration.noResults"]()}
                </EmptyTitle>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {listQuery.isPending &&
                Array.from({ length: 6 }, (_, index) => (
                  <li
                    key={index}
                    className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 px-3 py-2.5"
                  >
                    <Skeleton className="size-10 rounded-full" />
                    <div className="flex flex-col gap-2">
                      <Skeleton className="h-3.5 w-2/3" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                    <Skeleton className="h-3 w-8" />
                  </li>
                ))}
              {visible.map((item, index) => {
                const bucket = dayBucket(itemStamp(item, view))
                const startsBucket =
                  index === 0 ||
                  dayBucket(itemStamp(visible[index - 1], view)) !== bucket
                return (
                  <li key={item.id} className="flex flex-col gap-0.5">
                    {startsBucket && (
                      <Marker
                        variant="separator"
                        className="px-3 pt-3 pb-1 before:bg-border/35 after:bg-border/35"
                      >
                        <MarkerContent>{bucketLabel(bucket)}</MarkerContent>
                      </Marker>
                    )}
                    <InboxRow
                      item={item}
                      view={view}
                      selected={item.id === selected?.id}
                      read={readIds.has(item.id)}
                    />
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </aside>

      <main className={cn("flex min-h-0 flex-col", !hasSelection && "hidden md:flex")}>
        {selectedThread ? (
          <ThreadReviewPane
            key={selectedThread.id}
            thread={selectedThread}
            busy={busy}
            onApprove={() =>
              approveThreadMutation.mutate({
                data: { id: selectedThread.id },
              })
            }
            onReject={() =>
              rejectThreadMutation.mutate({
                data: { id: selectedThread.id },
              })
            }
          />
        ) : selected ? (
          <InboxThread
            key={selected.id}
            item={selected}
            view={view === "checkin" ? "checkin" : "review"}
            position={selectedIndex + 1}
            total={visible.length}
            onNavigate={(step) => {
              const neighbor = visible[selectedIndex + step]
              if (neighbor) openMessage(neighbor.id)
            }}
            onMarkUnread={() => {
              markUnread(selected.id)
              closeThread()
            }}
            reason={reason}
            onReasonChange={(value) =>
              setReasons((prev) => ({ ...prev, [selected.id]: value }))
            }
            busy={busy}
            onPublish={() =>
              publishMutation.mutate({
                data: { id: selected.id },
              })
            }
            onReject={() =>
              rejectMutation.mutate({
                data: { id: selected.id, reason },
              })
            }
            onPause={() =>
              pauseMutation.mutate({
                data: { id: selected.id, reason },
              })
            }
          />
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HugeiconsIcon icon={MessageIcon} />
              </EmptyMedia>
              <EmptyTitle>{m["pages.supportModeration.selectPrompt"]()}</EmptyTitle>
              <EmptyDescription>
                {m["pages.supportModeration.subtitle"]()}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </main>
    </div>
  )
}
