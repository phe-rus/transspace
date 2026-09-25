import { getRequestHeaders } from "@tanstack/react-start/server"
import { getCurrentSession } from "@/middleware/session"
import { isModerator } from "@/lib/moderators"

export const DEFAULT_LIMIT = 20
export const MAX_LIMIT = 50
export const FALLBACK_BYLINE = "Community contributor"

export function getClientKey(): string {
    return getRequestHeaders().get("cf-connecting-ip") ?? "anonymous"
}

// GET /guides and GET /guides/:id both need "is this caller a
// moderator, if they even have a session" without ever requiring one
// (spec 0004 API surface): no middleware, read the session directly
export async function currentModeratorId(): Promise<string | null> {
    const session = await getCurrentSession()
    if (!session) return null
    return (await isModerator(session.userLinkId))
        ? session.userLinkId
        : null
}

export function bylineFrom(row: {
    displayName: string | null
    deletedAt: Date | null
} | null): string {
    if (!row || row.deletedAt || !row.displayName) {
        return FALLBACK_BYLINE
    }
    return row.displayName
}
