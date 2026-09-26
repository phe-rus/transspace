import { eq } from "drizzle-orm"
import { db } from "@/db"
import { moderators } from "@/schemas/moderation"
import { isAdmin } from "./admins"

// an admin has every moderator privilege too, so this is the one check
// every existing moderator-gated endpoint already calls (ModeratorMiddleware,
// currentModeratorId()); nothing else needed an admin-aware update
export async function isModerator(
    userLinkId: string
): Promise<boolean> {
    const [row] = await db
        .select({ userLinkId: moderators.userLinkId })
        .from(moderators)
        .where(eq(moderators.userLinkId, userLinkId))
    if (row) return true
    return isAdmin(userLinkId)
}
