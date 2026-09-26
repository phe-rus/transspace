import { and, count, eq } from "drizzle-orm"
import { db } from "@/db"
import { guide } from "@/schemas/guides"
import { userLink } from "@/schemas/user-link"

const ESTABLISHED_MIN_THREADS = 2
const ESTABLISHED_MIN_AGE_MS = 7 * 24 * 60 * 60 * 1000

// spec 0010 AC-5: an established member has at least 2 published threads
// and an account at least 7 days old. Their threads publish at once, and
// (from slice 4) only they open a voice room. Read fresh every time, never
// cached, so the answer is right at the moment of the action
export async function isEstablishedMember(
    userLinkId: string
): Promise<boolean> {
    const [person] = await db
        .select({ createdAt: userLink.createdAt })
        .from(userLink)
        .where(eq(userLink.id, userLinkId))
    if (!person) return false
    if (Date.now() - person.createdAt.getTime() < ESTABLISHED_MIN_AGE_MS) {
        return false
    }

    const [row] = await db
        .select({ published: count() })
        .from(guide)
        .where(
            and(
                eq(guide.kind, "thread"),
                eq(guide.status, "published"),
                eq(guide.submittedBy, userLinkId)
            )
        )
    return (row?.published ?? 0) >= ESTABLISHED_MIN_THREADS
}
