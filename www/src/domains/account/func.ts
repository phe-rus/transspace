import { createServerFn } from "@tanstack/react-start"
import { eq, count, isNotNull } from "drizzle-orm"
import { db } from "@/db"
import { userLink } from "@/schemas/user-link"
import { MODERATOR_FLOOR } from "@/domains/moderators/types"
import { SessionMiddleware } from "@/middleware/require-session"
import { assertNotDecoy } from "@/lib/private-data"
import { logModerationAction } from "@/lib/moderation-audit"

// spec 0001 Build plan step 9 + Data model sketch's deleted_at handling.
// Content already submitted elsewhere is untouched by this spec (spec
// 0001 API surface). A moderator revoke here still respects the floor of
// two (spec 0002 key invariants); that invariant is general, not just
// the dedicated revoke endpoint's concern.
export const deleteAccount = createServerFn({ method: "POST" })
    .middleware([SessionMiddleware])
    .handler(async ({ context: session }) => {
        assertNotDecoy(session)
        const now = new Date()

        const [self] = await db
            .select({ moderatorGrantedAt: userLink.moderatorGrantedAt })
            .from(userLink)
            .where(eq(userLink.id, session.userLinkId))
        if (self?.moderatorGrantedAt) {
            const [{ total }] = await db
                .select({ total: count() })
                .from(userLink)
                .where(isNotNull(userLink.moderatorGrantedAt))
            if (total - 1 < MODERATOR_FLOOR) {
                throw new Response(
                    "Cannot delete this account: it is one of the last two moderators",
                    { status: 409 }
                )
            }
            await logModerationAction({
                actorUserLinkId: session.userLinkId,
                action: "moderator.revoke",
                target: session.userLinkId,
            })
        }

        // one row now holds the profile, the PIN state and moderator
        // status, so deleting the account clears them together (spec 0008
        // AC-6)
        await db
            .update(userLink)
            .set({
                infraUserId: null,
                deletedAt: now,
                displayName: null,
                avatarSlug: null,
                bio: null,
                pronouns: null,
                topics: null,
                ageRange: null,
                pinHash: null,
                duressPinHash: null,
                failedAttempts: 0,
                lockedUntil: null,
                moderatorGrantedAt: null,
                moderatorGrantedBy: null,
                moderatorCountryCode: null,
            })
            .where(eq(userLink.id, session.userLinkId))

        return { success: true as const }
    })
