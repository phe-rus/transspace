import { createServerFn } from "@tanstack/react-start"
import { queryOptions } from "@tanstack/react-query"
import { and, eq } from "drizzle-orm"
import { db } from "@/db"
import { supportPost, supportPostRead } from "@/schemas/support"
import { ModeratorMiddleware } from "@/middleware/require-moderator"
import { assertNotDecoy } from "@/lib/private-data"
import { assertReadRateLimit } from "@/lib/rate-limit"
import { supportPostReadSchema } from "../types"

// the ids of every post this moderator has opened in the inbox; anything
// not listed is unread for them
export const listSupportReadIdsQueryOptions = () =>
    queryOptions({
        queryKey: ["support-post-reads"],
        queryFn: () => listSupportReadIds(),
    })

export const listSupportReadIds = createServerFn({ method: "GET" })
    .middleware([ModeratorMiddleware])
    .handler(async ({ context: { userLinkId } }) => {
        await assertReadRateLimit(userLinkId)
        const rows = await db
            .select({ id: supportPostRead.supportPostId })
            .from(supportPostRead)
            .where(eq(supportPostRead.moderatorUserLinkId, userLinkId))
        return { ids: rows.map((row) => row.id) }
    })

// opening a message fires this once per message and stepping through the
// queue fires it back to back, so both writes use the generous read
// limiter, not the 30/min write one the moderation actions share. They
// only touch the caller's own marker, never a post
export const markSupportPostRead = createServerFn({ method: "POST" })
    .middleware([ModeratorMiddleware])
    .validator(supportPostReadSchema)
    .handler(async ({ data, context }) => {
        const { userLinkId } = context
        assertNotDecoy(context)
        await assertReadRateLimit(userLinkId)

        const [post] = await db
            .select({ id: supportPost.id })
            .from(supportPost)
            .where(eq(supportPost.id, data.id))
        if (!post) {
            throw new Response("Not found", { status: 404 })
        }

        await db
            .insert(supportPostRead)
            .values({
                moderatorUserLinkId: userLinkId,
                supportPostId: data.id,
                readAt: new Date(),
            })
            .onConflictDoNothing()

        return { id: data.id, read: true as const }
    })

export const markSupportPostUnread = createServerFn({ method: "POST" })
    .middleware([ModeratorMiddleware])
    .validator(supportPostReadSchema)
    .handler(async ({ data, context }) => {
        const { userLinkId } = context
        assertNotDecoy(context)
        await assertReadRateLimit(userLinkId)

        await db
            .delete(supportPostRead)
            .where(
                and(
                    eq(supportPostRead.moderatorUserLinkId, userLinkId),
                    eq(supportPostRead.supportPostId, data.id)
                )
            )

        return { id: data.id, read: false as const }
    })
