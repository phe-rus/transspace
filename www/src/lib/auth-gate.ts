import { createServerFn } from "@tanstack/react-start"
import { queryOptions } from "@tanstack/react-query"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { userLink } from "@/schemas/user-link"
import { getCurrentSession } from "@/middleware/session"
import { isOnboarded } from "@/domains/profile/types"

export type AuthGateStatus =
    | { signedIn: false }
    | { signedIn: true; onboarded: boolean; locked: boolean }

// the single source of truth both (public)'s and (protection)'s route
// guards read from. Not gated by SessionMiddleware on purpose: "no
// session" is a normal, expected outcome here (anonymous browsing is
// allowed everywhere in (public)), not a 401.
export const getAuthGateStatus = createServerFn({
    method: "GET",
}).handler(async (): Promise<AuthGateStatus> => {
    const session = await getCurrentSession()
    if (!session) return { signedIn: false }

    const [row] = await db
        .select({
            displayName: userLink.displayName,
            avatarSlug: userLink.avatarSlug,
            pinHash: userLink.pinHash,
        })
        .from(userLink)
        .where(eq(userLink.id, session.userLinkId))
    const onboarded = row ? isOnboarded(row) : false
    const hasPinSet = Boolean(row?.pinHash)
    const isUnlocked = Boolean(
        session.unlockedUntil &&
            session.unlockedUntil.getTime() > Date.now()
    )

    return { signedIn: true, onboarded, locked: hasPinSet && !isUnlocked }
})

// shared across every route guard (public, protection, the auth landing
// page) and the header, so it's fetched once per navigation and read
// from the query cache everywhere else, not re-fetched per consumer
export const authGateQueryOptions = () =>
    queryOptions({
        queryKey: ["auth-gate"],
        queryFn: () => getAuthGateStatus(),
    })
