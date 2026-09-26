import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { supportPost, supportUpdate } from "@/schemas/support"
import { SessionMiddleware } from "@/middleware/require-session"
import { assertNotDecoy } from "@/lib/private-data"
import { assertWriteRateLimit } from "@/lib/rate-limit"
import { isModerator } from "@/lib/moderators"
import { postSupportUpdateSchema } from "../types"

// kinds a caller may post directly through this endpoint; the rest
// (pause_reason, reactivation_note, withdrawal_reason, rejection_reason)
// are produced internally by the actions that cause them (spec 0005
// H8/H9)
const DIRECT_KINDS = ["progress", "pause_response", "moderator_note"] as const

export const postSupportUpdate = createServerFn({ method: "POST" })
    .middleware([SessionMiddleware])
    .validator(postSupportUpdateSchema)
    .handler(async ({ data, context }) => {
        const { userLinkId } = context
        assertNotDecoy(context)
        await assertWriteRateLimit(userLinkId)

        if (!(DIRECT_KINDS as readonly string[]).includes(data.kind)) {
            throw new Response("Unsupported update kind", { status: 422 })
        }

        const [post] = await db
            .select({
                status: supportPost.status,
                authorUserLinkId: supportPost.authorUserLinkId,
            })
            .from(supportPost)
            .where(eq(supportPost.id, data.id))
        if (!post) {
            throw new Response("Not found", { status: 404 })
        }

        const isAuthor = post.authorUserLinkId === userLinkId
        const isMod = await isModerator(userLinkId)

        if (data.kind === "moderator_note" && !isMod) {
            throw new Response("Forbidden", { status: 403 })
        }
        if (data.kind === "pause_response") {
            if (!isAuthor) {
                throw new Response("Forbidden", { status: 403 })
            }
            if (post.status !== "paused") {
                throw new Response("This post is not paused", {
                    status: 409,
                })
            }
        }
        if (data.kind === "progress") {
            if (!isAuthor && !isMod) {
                throw new Response("Forbidden", { status: 403 })
            }
            if (data.amount === undefined) {
                throw new Response("amount is required", { status: 422 })
            }
        }

        await db.insert(supportUpdate).values({
            id: crypto.randomUUID(),
            supportPostId: data.id,
            authorUserLinkId: userLinkId,
            kind: data.kind,
            amount: data.amount ?? null,
            body: data.body ?? null,
            createdAt: new Date(),
        })

        return { supportPostId: data.id, kind: data.kind }
    })
