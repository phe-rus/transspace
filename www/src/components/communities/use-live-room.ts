import {
  REMOVED_CLOSE_CODE,
  type ChatMessage,
  type ClientToRoom,
  type RetentionHours,
  type RoomErrorCode,
  type RoomToClient,
  type LiveMode,
  type LiveSession,
  type VoiceSignalData,
  type VoiceState,
} from "@/data/live-room"
import { useCallback, useEffect, useRef, useState } from "react"

export type LiveStatus = "connecting" | "open" | "reconnecting" | "removed"

// the page keeps at most this many messages in memory
const KEEP_MESSAGES = 500
const PING_MS = 30 * 1000
const MAX_BACKOFF_MS = 30 * 1000

function mergeMessages(
  current: ChatMessage[],
  incoming: ChatMessage[],
  removedIds: readonly string[] = []
): ChatMessage[] {
  const removed = new Set(removedIds)
  const byId = new Map(current.map((message) => [message.id, message]))
  for (const message of incoming) byId.set(message.id, message)
  return [...byId.values()]
    .filter((message) => !removed.has(message.id))
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(-KEEP_MESSAGES)
}

// one community's live room over a WebSocket (spec 0010 AC-11, AC-13).
// When the connection drops or the tab sleeps it reconnects with a growing
// delay, then asks for everything after the last message it saw. A
// moderator's removal ends it for good
export function useLiveRoom(
  // null: not in any room (the app wide live session is idle)
  slug: string | null,
  handlers: {
    onError: (code: RoomErrorCode) => void
    onReported: () => void
    onVoiceRemoved: () => void
    onLiveEnded: () => void
  }
) {
  const [status, setStatus] = useState<LiveStatus>("connecting")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [retentionHours, setRetentionHours] = useState<RetentionHours | null>(null)
  const [voice, setVoice] = useState<VoiceState | null>(null)
  const [mode, setMode] = useState<LiveMode>("normal")
  const [session, setSession] = useState<LiveSession | null>(null)
  // set by the voice hook; WebRTC signals go straight to it, not to state
  const signalHandlerRef = useRef<
    ((from: string, data: VoiceSignalData) => void) | null
  >(null)
  // bumped on every successful (re)connect, so voice can rejoin its seat
  const [connection, setConnection] = useState(0)

  const socketRef = useRef<WebSocket | null>(null)
  const lastIdRef = useRef<string | undefined>(undefined)
  const attemptsRef = useRef(0)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stoppedRef = useRef(false)
  const connectRef = useRef<() => void>(() => {})
  // the latest handlers, without reconnecting when they change
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    lastIdRef.current = undefined
    setMessages([])
    setVoice(null)
    setSession(null)
    setMode("normal")
    setStatus("connecting")
    if (!slug) return
    stoppedRef.current = false

    const clearTimers = () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
      if (pingTimerRef.current) clearInterval(pingTimerRef.current)
      retryTimerRef.current = null
      pingTimerRef.current = null
    }

    const connect = () => {
      clearTimers()
      if (stoppedRef.current) return
      const protocol = window.location.protocol === "https:" ? "wss" : "ws"
      const socket = new WebSocket(
        `${protocol}://${window.location.host}/api/communities/${slug}/room`
      )
      socketRef.current = socket

      socket.onopen = () => {
        attemptsRef.current = 0
        setStatus("open")
        setConnection((count) => count + 1)
        socket.send(
          JSON.stringify({
            type: "chat.history",
            sinceId: lastIdRef.current,
          } satisfies ClientToRoom)
        )
        // answered by the room without waking it
        pingTimerRef.current = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) socket.send("ping")
        }, PING_MS)
      }

      socket.onmessage = (event) => {
        if (event.data === "pong") return
        let message: RoomToClient
        try {
          message = JSON.parse(String(event.data)) as RoomToClient
        } catch {
          return
        }
        switch (message.type) {
          case "chat.history":
            setRetentionHours(message.retentionHours)
            setMessages((current) =>
              mergeMessages(current, message.messages, message.removedIds)
            )
            if (message.messages.length) {
              lastIdRef.current = message.messages.at(-1)!.id
            }
            break
          case "chat.message":
            setMessages((current) => mergeMessages(current, [message.message]))
            lastIdRef.current = message.message.id
            break
          case "chat.removed":
            setMessages((current) => mergeMessages(current, [], [message.id]))
            break
          case "room.retention":
            setRetentionHours(message.retentionHours)
            break
          case "chat.reported":
            handlersRef.current.onReported()
            break
          case "voice.state":
            setVoice(message.state)
            break
          case "live.mode":
            setMode(message.mode)
            break
          case "live.session":
            setSession(message.session)
            break
          case "room.removed":
            // the same as the removal close code: stop, and never reconnect
            stoppedRef.current = true
            setStatus("removed")
            socketRef.current = null
            socket.close(REMOVED_CLOSE_CODE)
            break
          case "live.ended":
            // the room deleted the live's chat; so does the page
            setMessages([])
            lastIdRef.current = undefined
            handlersRef.current.onLiveEnded()
            break
          case "voice.signal":
            signalHandlerRef.current?.(message.from, message.data)
            break
          case "voice.removed":
            handlersRef.current.onVoiceRemoved()
            break
          case "voice.seatFree":
            // the offer also arrives in voice.state, which drives the prompt
            break
          case "error":
            handlersRef.current.onError(message.code)
            break
        }
      }

      socket.onclose = (event) => {
        if (socketRef.current !== socket) return
        clearTimers()
        socketRef.current = null
        if (stoppedRef.current) return
        if (event.code === REMOVED_CLOSE_CODE) {
          stoppedRef.current = true
          setStatus("removed")
          return
        }
        setStatus("reconnecting")
        const delay =
          Math.min(MAX_BACKOFF_MS, 1000 * 2 ** attemptsRef.current) +
          Math.random() * 500
        attemptsRef.current += 1
        retryTimerRef.current = setTimeout(connect, delay)
      }
    }
    connectRef.current = connect

    // a tab coming back, or the network returning, tries at once instead
    // of waiting out the delay
    const wake = () => {
      if (document.visibilityState !== "visible") return
      if (!socketRef.current && !stoppedRef.current) {
        attemptsRef.current = 0
        connect()
      }
    }
    document.addEventListener("visibilitychange", wake)
    window.addEventListener("online", wake)

    connect()
    return () => {
      stoppedRef.current = true
      clearTimers()
      document.removeEventListener("visibilitychange", wake)
      window.removeEventListener("online", wake)
      socketRef.current?.close(1000)
      socketRef.current = null
    }
  }, [slug])

  const send = useCallback((message: ClientToRoom): boolean => {
    const socket = socketRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) return false
    socket.send(JSON.stringify(message))
    return true
  }, [])

  // after blocking someone: hide them now, and reconnect so the room
  // reads the new block list (it is read at connect time)
  const hideAuthor = useCallback((userLinkId: string) => {
    setMessages((current) =>
      current.filter((message) => message.authorUserLinkId !== userLinkId)
    )
    const socket = socketRef.current
    socketRef.current = null
    socket?.close(1000)
    attemptsRef.current = 0
    connectRef.current()
  }, [])

  return {
    status,
    connection,
    messages,
    retentionHours,
    voice,
    mode,
    session,
    signalHandlerRef,
    send,
    hideAuthor,
  }
}
