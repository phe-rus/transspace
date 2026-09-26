import type { RoomErrorCode } from "@/data/live-room"
import { m } from "@/paraglide/messages"

// what a person reads when the live room refuses something
export function errorText(code: RoomErrorCode): string {
  switch (code) {
    case "rate_limited":
      return m["pages.communities.live.errorRateLimited"]()
    case "forbidden":
      return m["pages.communities.live.errorForbidden"]()
    case "not_found":
      return m["pages.communities.live.errorNotFound"]()
    case "invalid":
      return m["pages.communities.live.errorInvalid"]()
    case "voice_not_allowed":
      return m["pages.communities.voice.notAllowed"]()
    case "voice_closed":
      return m["pages.communities.voice.closed"]()
    case "voice_paused":
      return m["pages.communities.live.voicePaused"]()
    case "not_live":
      return m["pages.communities.live.errorNotLive"]()
    case "live_not_allowed":
      return m["pages.communities.live.errorLiveNotAllowed"]()
    case "chat_slowed":
      return m["pages.communities.live.errorChatSlowed"]()
  }
}
