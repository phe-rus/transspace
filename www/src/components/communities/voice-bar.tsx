import { VOICE_SEATS } from "@/data/live-room"
import { m } from "@/paraglide/messages"
import {
  Call02Icon,
  CallEnd01Icon,
  Mic01Icon,
  MicOff01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Badge } from "@pherus/ui/badge"
import { Button } from "@pherus/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@pherus/ui/dropdown-menu"
import { cn } from "@pherus/ui/lib/utils"
import { useEffect, useState } from "react"
import type { useLiveRoom } from "./use-live-room"
import type { useVoice } from "./use-voice"

// seconds left on a seat offer, ticking once a second
function useSecondsLeft(expiresAt: number | null): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!expiresAt) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [expiresAt])
  return expiresAt ? Math.max(0, Math.ceil((expiresAt - now) / 1000)) : 0
}

// the voice strip above the chat (spec 0010 AC-14 to AC-16): the seated
// people as circles, and what this person can do right now
export function VoiceBar({
  room,
  voice,
  isModerator,
}: {
  room: ReturnType<typeof useLiveRoom>
  voice: ReturnType<typeof useVoice>
  isModerator: boolean
}) {
  const state = room.voice
  const connected = room.status === "open"
  const you = state?.you
  const isHost = Boolean(you && state?.hostUserLinkId === you)
  const offerForMe = state?.offer?.userLinkId === you ? state?.offer : null
  const secondsLeft = useSecondsLeft(offerForMe?.expiresAt ?? null)
  const seatsUsed = state?.seats.length ?? 0
  const full = seatsUsed >= VOICE_SEATS
  const linePosition = you && state ? state.waiting.indexOf(you) + 1 : 0
  // this page's seat is still held after a reload; it can take it back
  const heldForMe = Boolean(voice.mySeat?.held && !voice.active)

  if (!state?.open) {
    return (
      <section className="flex flex-col gap-2 border-b border-border/60 pb-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-foreground">
            {m["pages.communities.voice.title"]()}
          </span>
          <Button
            size="sm"
            variant="secondary"
            disabled={!connected || room.mode !== "normal"}
            onClick={() => voice.start("open")}
            className="gap-1.5 rounded-full"
          >
            <HugeiconsIcon icon={Call02Icon} />
            {m["pages.communities.voice.start"]()}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {m["pages.communities.voice.about"]()}
        </p>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-3 border-b border-border/60 pb-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-foreground">
          {m["pages.communities.voice.title"]()}{" "}
          <span className="text-xs font-normal text-muted-foreground tabular-nums">
            {m["pages.communities.voice.seatsUsed"]({ used: seatsUsed, max: VOICE_SEATS })}
          </span>
        </span>
        {isModerator && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => room.send({ type: "voice.end" })}
            className="rounded-full text-destructive"
          >
            {m["pages.communities.voice.end"]()}
          </Button>
        )}
      </div>

      <ul className="no-scrollbar flex list-none gap-4 overflow-x-auto ps-0 pt-1 *:ps-0">
        {state.seats.map((seat) => {
          const canMute = isHost && seat.userLinkId !== you && !seat.muted
          const canRemove = (isHost || isModerator) && seat.userLinkId !== you
          const circle = (
            <span
              className={cn(
                "relative flex size-12 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground",
                seat.held && "opacity-50",
              )}
            >
              {seat.displayName.charAt(0).toUpperCase()}
              {seat.muted && (
                <span className="absolute -right-0.5 -bottom-0.5 flex size-5 items-center justify-center rounded-full bg-background ring-1 ring-border">
                  <HugeiconsIcon icon={MicOff01Icon} className="size-3" />
                </span>
              )}
            </span>
          )
          return (
            <li key={seat.userLinkId} className="flex w-16 shrink-0 flex-col items-center gap-1">
              {canMute || canRemove ? (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <button
                        type="button"
                        aria-label={seat.displayName}
                        className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                      />
                    }
                  >
                    {circle}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {canMute && (
                      <DropdownMenuItem onClick={() => voice.setMuted(seat.userLinkId, true)}>
                        {m["pages.communities.voice.muteSomeone"]()}
                      </DropdownMenuItem>
                    )}
                    {canRemove && (
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() =>
                          room.send({ type: "voice.remove", userLinkId: seat.userLinkId })
                        }
                      >
                        {m["pages.communities.voice.remove"]()}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                circle
              )}
              <span className="w-full truncate text-center text-xs text-foreground">
                {seat.userLinkId === you ? m["pages.communities.voice.you"]() : seat.displayName}
              </span>
              {state.hostUserLinkId === seat.userLinkId && (
                <Badge variant="secondary" className="px-1.5 text-[0.625rem]">
                  {m["pages.communities.voice.host"]()}
                </Badge>
              )}
            </li>
          )
        })}
      </ul>

      {offerForMe && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">
              {m["pages.communities.voice.seatFreeTitle"]()}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {m["pages.communities.voice.seatFreeBody"]({ seconds: secondsLeft })}
            </span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => voice.start("join")} className="rounded-full">
              {m["pages.communities.voice.join"]()}
            </Button>
            <Button size="sm" variant="outline" onClick={voice.leave} className="rounded-full">
              {m["pages.communities.voice.decline"]()}
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {voice.mySeat && voice.active ? (
          <>
            <Button
              size="sm"
              variant={voice.mySeat.muted ? "secondary" : "outline"}
              aria-pressed={voice.mySeat.muted}
              onClick={() => voice.setMuted(voice.mySeat!.userLinkId, !voice.mySeat!.muted)}
              className="gap-1.5 rounded-full"
            >
              <HugeiconsIcon icon={voice.mySeat.muted ? MicOff01Icon : Mic01Icon} />
              {voice.mySeat.muted
                ? m["pages.communities.voice.unmute"]()
                : m["pages.communities.voice.mute"]()}
            </Button>
            <Button size="sm" variant="destructive" onClick={voice.leave} className="gap-1.5 rounded-full">
              <HugeiconsIcon icon={CallEnd01Icon} />
              {m["pages.communities.voice.leave"]()}
            </Button>
          </>
        ) : heldForMe ? (
          <Button size="sm" disabled={!connected} onClick={() => voice.start("join")} className="gap-1.5 rounded-full">
            <HugeiconsIcon icon={Call02Icon} />
            {m["pages.communities.voice.rejoin"]()}
          </Button>
        ) : linePosition > 0 ? (
          <>
            <span className="text-xs text-muted-foreground">
              {m["pages.communities.voice.full"]({ used: seatsUsed, max: VOICE_SEATS })}{" "}
              {m["pages.communities.voice.linePosition"]({ position: linePosition })}
            </span>
            <Button size="sm" variant="outline" onClick={voice.leave} className="rounded-full">
              {m["pages.communities.voice.leaveLine"]()}
            </Button>
          </>
        ) : offerForMe ? null : (
          <>
            {full && (
              <span className="text-xs text-muted-foreground">
                {m["pages.communities.voice.full"]({ used: seatsUsed, max: VOICE_SEATS })}
              </span>
            )}
            <Button
              size="sm"
              variant="secondary"
              disabled={!connected}
              onClick={() => voice.start("join")}
              className="gap-1.5 rounded-full"
            >
              <HugeiconsIcon icon={Call02Icon} />
              {full ? m["pages.communities.voice.waitForSeat"]() : m["pages.communities.voice.join"]()}
            </Button>
          </>
        )}
      </div>
    </section>
  )
}
