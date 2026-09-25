import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { guide } from "@/schemas/guides"
import { ModeratorMiddleware } from "@/middleware/require-moderator"
import { assertNotDecoy } from "@/lib/private-data"
import { logModerationAction } from "@/lib/moderation-audit"
import { assertWriteRateLimit } from "@/lib/rate-limit"
import { assertTurnstileVerified } from "@/lib/turnstile"
import { publishGuideSchema, rejectGuideSchema } from "../types"

export const publishGuide = createServerFn({ method: "POST" })
    .middleware([ModeratorMiddleware])
    .validator(publishGuideSchema)
    .handler(async ({ data, context }) => {
        const { userLinkId } = context
        assertNotDecoy(context)
        await assertWriteRateLimit(userLinkId)
        await assertTurnstileVerified(data.turnstileToken)

        const [row] = await db
            .select({ status: guide.status })
            .from(guide)
            .where(eq(guide.id, data.id))
        if (!row) {
            throw new Response("Not found", { status: 404 })
        }
        if (row.status !== "pending") {
            throw new Response("Not pending", { status: 422 })
        }

        await db
            .update(guide)
            .set({ status: "published", updatedAt: new Date() })
            .where(eq(guide.id, data.id))

        await logModerationAction({
            actorUserLinkId: userLinkId,
            action: "guide.publish",
            target: data.id,
        })

        return { id: data.id, status: "published" as const }
    })

export const rejectGuide = createServerFn({ method: "POST" })
    .middleware([ModeratorMiddleware])
    .validator(rejectGuideSchema)
    .handler(async ({ data, context }) => {
        const { userLinkId } = context
        assertNotDecoy(context)
        await assertWriteRateLimit(userLinkId)
        await assertTurnstileVerified(data.turnstileToken)

        const [row] = await db
            .select({ status: guide.status })
            .from(guide)
            .where(eq(guide.id, data.id))
        if (!row) {
            throw new Response("Not found", { status: 404 })
        }
        // reachable from pending (screening) or published (a takedown
        // of something already live), never from rejected again (spec
        // 0004 State transitions)
        if (row.status === "rejected") {
            throw new Response("Already rejected", { status: 422 })
        }

        await db
            .update(guide)
            .set({ status: "rejected", updatedAt: new Date() })
            .where(eq(guide.id, data.id))

        await logModerationAction({
            actorUserLinkId: userLinkId,
            action: "guide.reject",
            target: data.id,
        })

        return { id: data.id, status: "rejected" as const }
    })
