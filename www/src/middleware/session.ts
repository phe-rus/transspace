import { getRequestHeaders } from "@tanstack/react-start/server"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { session as sessionTable } from "@/schemas/auth"
import { userLink } from "@/schemas/user-link"
import { auth } from "@/lib/auth"

// 10 minutes of inactivity (spec 0001 State transitions, Follow up: a
// reasonable default, revisit once real usage patterns exist)
export const UNLOCK_WINDOW_MS = 10 * 60 * 1000

// userLink.id is set to Better Auth's own local account.userId at first
// sign in (lib/auth.ts's account.create.after hook), so no extra join is
// needed to go from a Better Auth session to a userLink row.
export type CurrentSession = {
    sessionId: string
    userLinkId: string
    isDecoy: boolean
    unlockedUntil: Date | null
}

// the one place every private, session scoped read/write path reads "who
// is this and are they in decoy mode" from (spec 0001 key invariants).
// Returns null for no session at all, never throws: callers decide what
// an absent session means for them.
export async function getCurrentSession(): Promise<CurrentSession | null> {
    const result = await auth.api.getSession({
        headers: getRequestHeaders(),
    })
    if (!result) return null
    const raw = result.session as {
        id: string
        userId: string
        isDecoy?: boolean
        unlockedUntil?: Date | string | null
    }
    // a banned account is treated as fully signed out here, the one
    // seam every session-gated read/write already goes through, rather
    // than a per-endpoint check that could be missed (engineer's
    // explicit call, 2026-09-25: a ban blocks everything immediately,
    // even with an existing valid session cookie)
    const [link] = await db
        .select({ bannedAt: userLink.bannedAt })
        .from(userLink)
        .where(eq(userLink.id, raw.userId))
    if (link?.bannedAt) return null

    const unlockedUntil = raw.unlockedUntil
        ? new Date(raw.unlockedUntil)
        : null
    // a still-valid unlock slides forward on every request that touches
    // it, so actively using the app doesn't re-lock it out from under
    // someone (spec 0001 State transitions). Never auto-unlocks: a null
    // or expired window is left alone here.
    if (unlockedUntil && unlockedUntil.getTime() > Date.now()) {
        const extended = new Date(Date.now() + UNLOCK_WINDOW_MS)
        await db
            .update(sessionTable)
            .set({ unlockedUntil: extended })
            .where(eq(sessionTable.id, raw.id))
        return {
            sessionId: raw.id,
            userLinkId: raw.userId,
            isDecoy: Boolean(raw.isDecoy),
            unlockedUntil: extended,
        }
    }
    return {
        sessionId: raw.id,
        userLinkId: raw.userId,
        isDecoy: Boolean(raw.isDecoy),
        unlockedUntil,
    }
}

// kept as its own export: every existing caller (require-session.ts,
// require-moderator.ts) only ever needed the id, so this stays a
// one-file change rather than touching every call site
export async function getCurrentUserLinkId(): Promise<
    string | null
> {
    const session = await getCurrentSession()
    return session?.userLinkId ?? null
}
