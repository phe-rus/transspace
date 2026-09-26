import type { CommunitySlug } from "@/data/communities"
import { notifyError, notifySuccess } from "@/lib/toast"
import { m } from "@/paraglide/messages"
import { useLocation } from "@tanstack/react-router"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { LiveBubble } from "./live-bubble"
import { errorText } from "./live-errors"
import { useLiveRoom } from "./use-live-room"
import { useSpeaking } from "./use-speaking"
import { useVoice } from "./use-voice"

type LiveSessionValue = {
  // the community whose live this page is in, or null
  slug: CommunitySlug | null
  enter: (slug: CommunitySlug) => void
  exit: () => void
  room: ReturnType<typeof useLiveRoom>
  voice: ReturnType<typeof useVoice>
  // who is audibly speaking right now (muted seats left out)
  speaking: Set<string>
  // the page is showing this live's own Live tab
  onLiveTab: boolean
}

const LiveSessionContext = createContext<LiveSessionValue | null>(null)

// one live connection for the whole app, so a live (and its voice) keeps
// going while the person looks at other pages. Entering a community's Live
// tab joins its room; leaving the tab keeps you in while the live runs, and
// the floating circle takes over. Only "Leave live" (or the live ending)
// disconnects
export function LiveSessionProvider({ children }: { children: ReactNode }) {
  const [slug, setSlug] = useState<CommunitySlug | null>(null)
  const location = useLocation()

  const room = useLiveRoom(slug, {
    onError: (code) => {
      // a voice request the room refused leaves nothing half started
      if (
        code === "voice_not_allowed" ||
        code === "voice_closed" ||
        code === "voice_paused" ||
        code === "not_live"
      ) {
        voice.teardown()
      }
      notifyError(new Error(errorText(code)))
    },
    onReported: () => notifySuccess(m["pages.communities.live.reportedToast"]()),
    onVoiceRemoved: () => {
      voice.teardown()
      notifyError(new Error(m["pages.communities.voice.removedToast"]()))
    },
    onLiveEnded: () => {
      voice.teardown()
      notifySuccess(m["pages.communities.live.endedToast"]())
    },
  })
  const voice = useVoice(slug, room, (problem) =>
    notifyError(
      new Error(
        problem === "mic"
          ? m["pages.communities.voice.micDenied"]()
          : m["pages.communities.voice.notSetUp"]()
      )
    )
  )

  const heard = useSpeaking(voice.streams)
  const speaking = useMemo(() => {
    const muted = new Set(
      (room.voice?.seats ?? []).filter((seat) => seat.muted).map((seat) => seat.userLinkId)
    )
    return new Set([...heard].filter((id) => !muted.has(id)))
  }, [heard, room.voice])

  const search = location.search as { tab?: string }
  const onLiveTab = Boolean(
    slug && location.pathname === `/communities/${slug}` && search.tab === "live"
  )

  const exit = useCallback(() => {
    if (voice.active) voice.leave()
    setSlug(null)
  }, [voice])

  const enter = useCallback(
    (next: CommunitySlug) => {
      if (next === slug) return
      // one live at a time: moving to another community's live leaves this one
      if (voice.active) voice.leave()
      setSlug(next)
    },
    [slug, voice]
  )

  // away from the Live tab, a room with no live running is not worth a
  // connection: a live that ended, or a closed room someone only looked at
  const live = Boolean(room.session?.open)
  useEffect(() => {
    if (slug && !onLiveTab && room.session && !live) setSlug(null)
  }, [slug, onLiveTab, room.session, live])

  const value = useMemo(
    () => ({ slug, enter, exit, room, voice, speaking, onLiveTab }),
    [slug, enter, exit, room, voice, speaking, onLiveTab]
  )

  return (
    <LiveSessionContext.Provider value={value}>
      {children}
      <LiveBubble />
    </LiveSessionContext.Provider>
  )
}

export function useLiveSession(): LiveSessionValue {
  const value = useContext(LiveSessionContext)
  if (!value) throw new Error("useLiveSession needs LiveSessionProvider")
  return value
}
