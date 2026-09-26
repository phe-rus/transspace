import {
  communityIcon,
  communityLabel,
  type CommunitySlug,
} from "@/data/communities"
import type { LiveSession, VoiceState } from "@/data/live-room"
import { m } from "@/paraglide/messages"
import {
  ArrowDown01Icon,
  CallEnd01Icon,
  Mic01Icon,
  MicOff01Icon,
  PictureInPictureOnIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@pherus/ui/button"
import { cn } from "@pherus/ui/lib/utils"
import { Link } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { useLiveSession } from "./live-session"
import { PeopleStack } from "./people-stack"

// Chrome and Edge's always on top window, which stays visible over other
// browser tabs and apps. Not in TypeScript's DOM types yet
type DocumentPictureInPicture = {
  requestWindow: (options: { width: number; height: number }) => Promise<Window>
}
function documentPip(): DocumentPictureInPicture | null {
  return (
    (window as unknown as { documentPictureInPicture?: DocumentPictureInPicture })
      .documentPictureInPicture ?? null
  )
}

// the floating live circle: shown while this page is in a running live and
// not looking at its Live tab, so the live (and voice) goes on while the
// person does other things. It opens into a panel, which can pop out into
// its own always on top window
export function LiveBubble() {
  const { slug, room, onLiveTab } = useLiveSession()
  const [expanded, setExpanded] = useState(false)
  const [pip, setPip] = useState<Window | null>(null)
  const session = room.session
  const running = Boolean(slug && session?.open)

  // the popped out window goes when the live does
  useEffect(() => {
    if (!running && pip) pip.close()
  }, [running, pip])

  async function popOut() {
    const api = documentPip()
    if (!api) return
    const win = await api.requestWindow({ width: 340, height: 480 })
    // the page's styles, so the panel looks the same out there
    for (const sheet of [...document.styleSheets]) {
      try {
        const style = win.document.createElement("style")
        style.textContent = [...sheet.cssRules].map((rule) => rule.cssText).join("\n")
        win.document.head.appendChild(style)
      } catch {
        if (sheet.href) {
          const link = win.document.createElement("link")
          link.rel = "stylesheet"
          link.href = sheet.href
          win.document.head.appendChild(link)
        }
      }
    }
    win.document.documentElement.className = document.documentElement.className
    win.document.body.className = "bg-background text-foreground p-3"
    win.addEventListener("pagehide", () => setPip(null))
    setExpanded(false)
    setPip(win)
  }

  if (!running || !slug || !session) return null

  if (pip) {
    return createPortal(<LivePanel slug={slug} session={session} inWindow />, pip.document.body)
  }
  // the Live tab shows all of this itself
  if (onLiveTab) return null

  if (expanded) {
    return (
      <div data-not-typeset className="fixed right-4 bottom-20 z-50">
        <LivePanel
          slug={slug}
          session={session}
          onCollapse={() => setExpanded(false)}
          onPopOut={documentPip() ? popOut : undefined}
        />
      </div>
    )
  }

  return <CollapsedCircle slug={slug} session={session} onOpen={() => setExpanded(true)} />
}

function CollapsedCircle({
  slug,
  session,
  onOpen,
}: {
  slug: CommunitySlug
  session: LiveSession
  onOpen: () => void
}) {
  const { speaking } = useLiveSession()
  const someoneSpeaking = speaking.size > 0

  return (
    <button
      type="button"
      data-not-typeset
      onClick={onOpen}
      aria-label={`${m["pages.communities.bubble.expand"]()}, ${communityLabel(slug)}, ${m["pages.communities.bubble.people"]({ count: session.people })}`}
      className="fixed right-4 bottom-20 z-50 flex size-14 items-center justify-center rounded-full bg-background shadow-lg ring-2 ring-success outline-none focus-visible:ring-4 focus-visible:ring-ring/30"
    >
      {/* a soft pulse while anyone is speaking */}
      {someoneSpeaking && (
        <span aria-hidden className="absolute inset-0 animate-ping rounded-full ring-2 ring-success/60" />
      )}
      <HugeiconsIcon icon={communityIcon[slug]} className="size-6" />
      <span className="absolute -top-1 -right-1 flex min-w-5 items-center justify-center rounded-full bg-success px-1.5 text-xs font-semibold text-white tabular-nums">
        {session.people}
      </span>
    </button>
  )
}

function LivePanel({
  slug,
  session,
  inWindow = false,
  onCollapse,
  onPopOut,
}: {
  slug: CommunitySlug
  session: LiveSession
  inWindow?: boolean
  onCollapse?: () => void
  onPopOut?: () => void
}) {
  const { room, voice, speaking, exit } = useLiveSession()
  const state: VoiceState | null = room.voice
  const you = state?.you
  const seated = Boolean(voice.mySeat && voice.active)
  const muted = voice.mySeat?.muted ?? true
  const linePosition = you && state ? state.waiting.indexOf(you) + 1 : 0

  function mainAction() {
    if (seated && you) {
      voice.setMuted(you, !muted)
    } else if (linePosition === 0) {
      // everyone joins muted and unmutes with this same button
      voice.start(state?.open ? "join" : "open")
    }
  }

  return (
    <section
      className={cn(
        "flex flex-col gap-4",
        inWindow ? "w-full" : "w-80 rounded-3xl bg-background p-4 shadow-xl ring-1 ring-border/60",
      )}
    >
      <header className="flex items-center gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
          <HugeiconsIcon icon={communityIcon[slug]} className="size-4" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold text-foreground">{communityLabel(slug)}</span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-success" />
            {m["pages.communities.live.connected"]()}
          </span>
        </span>
        {onPopOut && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onPopOut}
            aria-label={m["pages.communities.bubble.popOut"]()}
            className="rounded-full"
          >
            <HugeiconsIcon icon={PictureInPictureOnIcon} />
          </Button>
        )}
        {onCollapse && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onCollapse}
            aria-label={m["pages.communities.bubble.collapse"]()}
            className="rounded-full"
          >
            <HugeiconsIcon icon={ArrowDown01Icon} />
          </Button>
        )}
      </header>

      {state?.seats.length ? (
        <ul className="flex list-none flex-wrap gap-3 ps-0 *:ps-0">
          {state.seats.map((seat) => {
            const isSpeaking = speaking.has(seat.userLinkId)
            return (
              <li key={seat.userLinkId} className="flex w-14 flex-col items-center gap-1">
                <span className="relative flex size-12 items-center justify-center">
                  {/* speaking: a ring that breathes while the voice is heard */}
                  {isSpeaking && (
                    <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-success/25" />
                  )}
                  <span
                    className={cn(
                      "relative flex size-12 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground transition-shadow",
                      isSpeaking && "ring-2 ring-success",
                      seat.held && "opacity-50",
                    )}
                  >
                    {seat.displayName.charAt(0).toUpperCase()}
                  </span>
                  {seat.muted && (
                    <span className="absolute -right-0.5 -bottom-0.5 flex size-5 items-center justify-center rounded-full bg-background ring-1 ring-border">
                      <HugeiconsIcon icon={MicOff01Icon} className="size-3" />
                    </span>
                  )}
                </span>
                <span className="w-full truncate text-center text-xs text-foreground">
                  {seat.userLinkId === you ? m["pages.communities.voice.you"]() : seat.displayName}
                </span>
                {isSpeaking && <span className="sr-only">{m["pages.communities.bubble.speaking"]()}</span>}
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">{m["pages.communities.bubble.noVoice"]()}</p>
      )}

      <div className="flex items-center gap-2">
        <Button
          size="icon"
          variant={seated && !muted ? "default" : "secondary"}
          disabled={linePosition > 0}
          onClick={mainAction}
          aria-pressed={seated ? !muted : undefined}
          aria-label={
            seated
              ? muted
                ? m["pages.communities.voice.unmute"]()
                : m["pages.communities.voice.mute"]()
              : m["pages.communities.bubble.joinMuted"]()
          }
          className="size-14 shrink-0 rounded-full"
        >
          <HugeiconsIcon icon={seated && !muted ? Mic01Icon : MicOff01Icon} className="size-6" />
        </Button>
        <span className="flex-1 text-xs text-muted-foreground">
          {linePosition > 0
            ? m["pages.communities.voice.linePosition"]({ position: linePosition })
            : seated
              ? muted
                ? m["pages.communities.voice.unmute"]()
                : m["pages.communities.voice.mute"]()
              : m["pages.communities.bubble.joinMuted"]()}
        </span>
        <Button
          size="icon"
          variant="destructive"
          onClick={exit}
          aria-label={m["pages.communities.bubble.leave"]()}
          className="size-10 shrink-0 rounded-full"
        >
          <HugeiconsIcon icon={CallEnd01Icon} />
        </Button>
      </div>

      <footer className="flex items-center justify-between gap-3">
        <PeopleStack session={session} />
        {!inWindow && (
          <Link
            to="/communities/$slug"
            params={{ slug }}
            search={{ tab: "live" }}
            className="text-xs font-medium text-foreground underline-offset-4 hover:underline"
          >
            {m["pages.communities.bubble.openLive"]()}
          </Link>
        )}
      </footer>
    </section>
  )
}
