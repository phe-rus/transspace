import { eq } from "drizzle-orm"
import { db } from "@/db"
import { userLink } from "@/schemas/user-link"

// an admin has every moderator privilege too, so this is the one check
// every existing moderator-gated endpoint already calls (ModeratorMiddleware,
// currentModeratorId()); nothing else needed an admin-aware update.
// A person is a moderator when moderatorGrantedAt is set (spec 0008)
export async function isModerator(
    userLinkId: string
): Promise<boolean> {
    const [row] = await db
        .select({
            moderatorGrantedAt: userLink.moderatorGrantedAt,
            adminRole: userLink.adminRole,
        })
        .from(userLink)
        .where(eq(userLink.id, userLinkId))
    return Boolean(row && (row.moderatorGrantedAt || row.adminRole))
}
