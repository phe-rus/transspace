import { eq } from "drizzle-orm"
import { db } from "@/db"
import { moderators } from "@/schemas/moderation"

export async function isModerator(
    userLinkId: string
): Promise<boolean> {
    const [row] = await db
        .select({ userLinkId: moderators.userLinkId })
        .from(moderators)
        .where(eq(moderators.userLinkId, userLinkId))
    return Boolean(row)
}
