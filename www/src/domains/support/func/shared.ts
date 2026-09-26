import { getRequestHeaders, getRequest } from "@tanstack/react-start/server"
import { getCurrentSession } from "@/middleware/session"
import { isModerator } from "@/lib/moderators"
import { isAdmin } from "@/lib/admins"
import { RESTRICTED_COUNTRY_CODES } from "@/data/restricted-countries"
import type {
    SupportPostStatus,
    SupportVisibilityTier,
} from "@/data/support-types"

export const DEFAULT_LIMIT = 20
export const MAX_LIMIT = 50

export function getClientKey(): string {
    return getRequestHeaders().get("cf-connecting-ip") ?? "anonymous"
}

// mirrors resources/guides' "is this caller a moderator, if they even
// have a session" read, without ever requiring one (spec 0005 API
// surface)
export async function currentModeratorId(): Promise<string | null> {
    const session = await getCurrentSession()
    if (!session) return null
    return (await isModerator(session.userLinkId))
        ? session.userLinkId
        : null
}

// spec 0005 AC-3/AC-9/AC-13, key invariants, now revised: a moderator
// can never act on their own submitted post (spec 0002 AC-2 guarantees a
// second moderator always exists to pick it up), but an admin can act on
// their own, the one exception the engineer explicitly asked for once a
// real admin role existed (2026-09-25)
export async function assertSelfReviewAllowed(
    actorUserLinkId: string,
    authorUserLinkId: string
): Promise<void> {
    if (actorUserLinkId !== authorUserLinkId) return
    if (await isAdmin(actorUserLinkId)) return
    throw new Response(
        "A moderator cannot act on their own post",
        { status: 403 }
    )
}

// spec 0005 AC-4, cross-check B2/B3: the viewer's ISO country code, fail
// closed. A missing code (local dev), Tor exit ("T1"), or an unresolved
// value ("XX") is treated as restricted, so the critical tier's
// protection can never be silently bypassed by an unreadable signal.
export function isRestrictedCountry(countryCode: string | null): boolean {
    if (!countryCode || countryCode === "T1" || countryCode === "XX") {
        return true
    }
    return RESTRICTED_COUNTRY_CODES.includes(countryCode)
}

export function getVisitorCountryCode(): string | null {
    const request = getRequest() as Request & {
        cf?: { country?: string }
    }
    return request.cf?.country ?? null
}

// spec 0005 AC-4: read visibility by status. published follows tier;
// fulfilled is readable by direct link and only listed behind an
// explicit filter; every other status is author/moderator only.
export function isStatusPubliclyReadable(
    status: SupportPostStatus,
    opts: { isDirectLookup: boolean }
): boolean {
    if (status === "published") return true
    if (status === "fulfilled") return opts.isDirectLookup
    return false
}

export type SupportContentVisibility = "full" | "redacted" | "locked"

// spec 0005 AC-4: resolves how much of a public/sensitive/critical tier
// post a caller with no elevated access (not the author, not a
// moderator) sees. Call only for these three tiers; `private` is a hard
// access check the caller (get.ts/list.ts) makes directly, never routed
// through this redaction spectrum.
export function resolveContentVisibility(
    tier: Exclude<SupportVisibilityTier, "private">,
    opts: { isSignedIn: boolean; countryCode: string | null }
): SupportContentVisibility {
    if (tier === "public") return "full"
    if (opts.isSignedIn) return "full"
    if (tier === "critical" && isRestrictedCountry(opts.countryCode)) {
        return "locked"
    }
    return "redacted"
}
