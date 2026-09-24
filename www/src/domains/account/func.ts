import { createServerFn } from "@tanstack/react-start"
import { eq, count } from "drizzle-orm"
import { db } from "@/db"
import { userLink } from "@/schemas/user-link"
import { profile } from "@/schemas/profile"
import { appLock } from "@/schemas/app-lock"
import { moderators } from "@/schemas/moderation"
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

        const [isModerator] = await db
            .select({ userLinkId: moderators.userLinkId })
            .from(moderators)
            .where(eq(moderators.userLinkId, session.userLinkId))
        if (isModerator) {
            const [{ total }] = await db
                .select({ total: count() })
                .from(moderators)
            if (total - 1 < MODERATOR_FLOOR) {
                throw new Response(
                    "Cannot delete this account: it is one of the last two moderators",
                    { status: 409 }
                )
            }
            await db
                .delete(moderators)
                .where(
                    eq(moderators.userLinkId, session.userLinkId)
                )
            await logModerationAction({
                actorUserLinkId: session.userLinkId,
                action: "moderator.revoke",
                target: session.userLinkId,
            })
        }

        await db
            .update(profile)
            .set({
                displayName: null,
                avatarSlug: null,
                bio: null,
                pronouns: null,
                topics: null,
                deletedAt: now,
            })
            .where(eq(profile.userLinkId, session.userLinkId))
        await db
            .delete(appLock)
            .where(eq(appLock.userLinkId, session.userLinkId))
        await db
            .update(userLink)
            .set({ infraUserId: null, deletedAt: now })
            .where(eq(userLink.id, session.userLinkId))

        return { success: true as const }
    })
