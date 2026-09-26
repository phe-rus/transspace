// the wire protocol between a community's live room (the CommunityRoom
// Durable Object) and the Live tab (spec 0010 API surface). Shared by both
// sides, so it holds types and limits only, never server code

// AC-11: plain text, 1 to 1000 characters, at most 20 a minute per person
export const CHAT_MAX_LENGTH = 1000
export const CHAT_PER_MINUTE = 20

// AC-12: a moderator picks one of these per community, 24 hours by default
export const RETENTION_HOURS = [24, 168, 720] as const
export type RetentionHours = (typeof RETENTION_HOURS)[number]
export const DEFAULT_RETENTION_HOURS: RetentionHours = 24

// AC-18: when daily usage nears the free plan limits, new voice pauses
// first, then chat slows to one message per 10 seconds per person. A new
// UTC day starts back at normal. Threads and replies are never limited
export type LiveMode = "normal" | "voicePaused" | "chatSlowed"
export const CHAT_SLOWED_MS = 10 * 1000

// the close code a room uses when a moderator removes someone; the page
// must not reconnect on its own after it
export const REMOVED_CLOSE_CODE = 4003

// a live is started and ended, never always on (engineer's call,
// 2026-09-26): chat and voice only work while one is running. Ending it
// ends voice and deletes its chat. A live everyone has left ends itself
// after this long
export const EMPTY_LIVE_ENDS_MS = 2 * 60 * 1000

// a few faces for the stacked circles; the total is in `people`
export const LIVE_FACES = 5

export type LiveSession = {
  open: boolean
  hostUserLinkId: string | null
  hostName: string | null
  startedAt: number | null
  // everyone in the room right now (distinct people, not tabs), in voice
  // or not, and the first few of them for the stacked circles
  people: number
  faces: { userLinkId: string; displayName: string }[]
}

// AC-14, AC-15: voice seats, the hold after a dropped connection, and how
// long a freed seat is offered to the next person waiting
export const VOICE_SEATS = 6
export const SEAT_HOLD_MS = 30 * 1000
export const SEAT_OFFER_MS = 20 * 1000
// a WebRTC offer, answer or ICE candidate is a few KB at most
export const VOICE_SIGNAL_MAX_BYTES = 16 * 1024

export type VoiceSeat = {
  userLinkId: string
  displayName: string
  muted: boolean
  // the connection dropped; the seat is kept for SEAT_HOLD_MS
  held: boolean
}

export type VoiceState = {
  open: boolean
  hostUserLinkId: string | null
  seats: VoiceSeat[]
  // userLinkIds, first in line first
  waiting: string[]
  offer: { userLinkId: string; expiresAt: number } | null
  // the viewer's own id, so the page knows which seat is theirs
  you: string
}

// a WebRTC session description or ICE candidate, passed through the room
// untouched between two seated people
export type VoiceSignalData = {
  description?: { type: string; sdp?: string }
  candidate?: unknown
}

export type ChatMessage = {
  id: string
  authorUserLinkId: string
  // the pseudonymous profile name copied at send time, never anonymous
  authorName: string
  body: string
  createdAt: number
  mine: boolean
}

export type ClientToRoom =
  | { type: "chat.send"; body: string }
  | { type: "chat.history"; sinceId?: string }
  | { type: "chat.remove"; id: string }
  | { type: "chat.report"; id: string }
  | { type: "room.removePerson"; userLinkId: string }
  | { type: "live.start" }
  | { type: "live.end" }
  | { type: "voice.open" }
  | { type: "voice.join" }
  | { type: "voice.leave" }
  | { type: "voice.signal"; to: string; data: VoiceSignalData }
  | { type: "voice.mute"; userLinkId: string; muted: boolean }
  | { type: "voice.remove"; userLinkId: string }
  | { type: "voice.end" }

export type RoomErrorCode =
  | "invalid"
  | "rate_limited"
  | "forbidden"
  | "not_found"
  | "voice_not_allowed"
  | "voice_closed"
  | "voice_paused"
  | "not_live"
  | "live_not_allowed"
  | "chat_slowed"

export type RoomToClient =
  | { type: "chat.message"; message: ChatMessage }
  | { type: "chat.removed"; id: string }
  | {
      type: "chat.history"
      messages: ChatMessage[]
      // removals the page may have missed while it was away
      removedIds: string[]
      retentionHours: RetentionHours
    }
  | { type: "chat.reported"; id: string }
  | { type: "room.retention"; retentionHours: RetentionHours }
  | { type: "voice.state"; state: VoiceState }
  | { type: "voice.signal"; from: string; data: VoiceSignalData }
  | { type: "voice.seatFree"; expiresAt: number }
  | { type: "voice.removed" }
  | { type: "live.mode"; mode: LiveMode }
  | { type: "live.session"; session: LiveSession }
  | { type: "live.ended" }
  // a moderator removed this person; sent before the close, so every tab
  // learns it even if the close frame does not arrive
  | { type: "room.removed" }
  | { type: "error"; code: RoomErrorCode }

export function isRetentionHours(value: number): value is RetentionHours {
  return (RETENTION_HOURS as readonly number[]).includes(value)
}
