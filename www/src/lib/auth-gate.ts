import { createServerFn } from "@tanstack/react-start"
import { queryOptions } from "@tanstack/react-query"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { profile } from "@/schemas/profile"
import { appLock } from "@/schemas/app-lock"
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

    const [profileRow] = await db
        .select({
            displayName: profile.displayName,
            avatarSlug: profile.avatarSlug,
        })
        .from(profile)
        .where(eq(profile.userLinkId, session.userLinkId))
    const onboarded = profileRow ? isOnboarded(profileRow) : false

    const [lockRow] = await db
        .select({ pinHash: appLock.pinHash })
        .from(appLock)
        .where(eq(appLock.userLinkId, session.userLinkId))
    const hasPinSet = Boolean(lockRow?.pinHash)
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
