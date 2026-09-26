import {
  countPendingSupportPostsQueryOptions,
  listSupportReadIdsQueryOptions,
  markSupportPostRead,
  markSupportPostUnread,
} from "@/domains/support"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useMemo } from "react"

type ReadIds = { ids: string[] }

// which messages this moderator has opened, stored per moderator in the
// database. The cache is updated first so the row flips at once, and a
// failed write re-syncs from the server. `ready` is false until the first
// load, so a caller never marks something read against an unknown state
export function useInboxRead() {
  const queryClient = useQueryClient()
  const { data, isSuccess } = useQuery(listSupportReadIdsQueryOptions())
  const readIds = useMemo<ReadonlySet<string>>(
    () => new Set(data?.ids),
    [data]
  )

  const resync = () =>
    queryClient.invalidateQueries({
      queryKey: listSupportReadIdsQueryOptions().queryKey,
    })
  // the header badge counts unread pending posts, so it follows every
  // read/unread write
  const refreshBadge = () =>
    queryClient.invalidateQueries({
      queryKey: countPendingSupportPostsQueryOptions().queryKey,
    })
  const { mutate: sendRead } = useMutation({
    mutationFn: markSupportPostRead,
    onError: resync,
    onSettled: refreshBadge,
  })
  const { mutate: sendUnread } = useMutation({
    mutationFn: markSupportPostUnread,
    onError: resync,
    onSettled: refreshBadge,
  })

  const setCached = useCallback(
    (id: string, read: boolean) => {
      queryClient.setQueryData<ReadIds>(
        listSupportReadIdsQueryOptions().queryKey,
        (old) => {
          const ids = new Set(old?.ids)
          if (read) ids.add(id)
          else ids.delete(id)
          return { ids: [...ids] }
        }
      )
    },
    [queryClient]
  )

  const markRead = useCallback(
    (id: string) => {
      const current = queryClient.getQueryData<ReadIds>(
        listSupportReadIdsQueryOptions().queryKey
      )
      if (current?.ids.includes(id)) return
      setCached(id, true)
      sendRead({ data: { id } })
    },
    [queryClient, setCached, sendRead]
  )

  const markUnread = useCallback(
    (id: string) => {
      setCached(id, false)
      sendUnread({ data: { id } })
    },
    [setCached, sendUnread]
  )

  return { readIds, ready: isSuccess, markRead, markUnread }
}
