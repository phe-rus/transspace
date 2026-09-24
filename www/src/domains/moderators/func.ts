import { createServerFn } from "@tanstack/react-start"
import { count, eq } from "drizzle-orm"
import { db } from "@/db"
import { moderators } from "@/schemas/moderation"
import { ModeratorMiddleware } from "@/middleware/require-moderator"
import { logModerationAction } from "@/lib/moderation-audit"
import { paginationSchema, toPage } from "@/lib/pagination"
import { assertWriteRateLimit, assertReadRateLimit } from "@/lib/rate-limit"
import { assertTurnstileVerified } from "@/lib/turnstile"
import { assertNotDecoy } from "@/lib/private-data"
import {
    grantModeratorSchema,
    MODERATOR_FLOOR,
    revokeModeratorSchema,
} from "./types"

export const listModerators = createServerFn({ method: "GET" })
    .middleware([ModeratorMiddleware])
    .validator(paginationSchema)
    .handler(async ({ data, context: { userLinkId } }) => {
        await assertReadRateLimit(userLinkId)
        const rows = await db
            .select()
            .from(moderators)
            .limit(data.limit + 1)
        return toPage(
            rows.map((row) => ({ ...row, id: row.userLinkId })),
            data.limit
        )
    })

export const grantModerator = createServerFn({ method: "POST" })
    .middleware([ModeratorMiddleware])
    .validator(grantModeratorSchema)
    .handler(async ({ data, context }) => {
        const { userLinkId } = context
        assertNotDecoy(context)
        await assertWriteRateLimit(userLinkId)
        await assertTurnstileVerified(data.turnstileToken)
        if (data.targetUserLinkId === userLinkId) {
            throw new Response(
                "Cannot grant moderator status to yourself",
                { status: 422 }
            )
        }
        await db.insert(moderators).values({
            userLinkId: data.targetUserLinkId,
            grantedBy: userLinkId,
            grantedAt: new Date(),
        })
        await logModerationAction({
            actorUserLinkId: userLinkId,
            action: "moderator.grant",
            target: data.targetUserLinkId,
        })
        return { success: true as const }
    })

export const revokeModerator = createServerFn({ method: "POST" })
    .middleware([ModeratorMiddleware])
    .validator(revokeModeratorSchema)
    .handler(async ({ data, context }) => {
        const { userLinkId } = context
        assertNotDecoy(context)
        await assertWriteRateLimit(userLinkId)
        await assertTurnstileVerified(data.turnstileToken)
        const [target] = await db
            .select({ userLinkId: moderators.userLinkId })
            .from(moderators)
            .where(eq(moderators.userLinkId, data.userLinkId))
        if (!target) {
            throw new Response("Not a moderator", {
                status: 404,
            })
        }
        const [{ total }] = await db
            .select({ total: count() })
            .from(moderators)
        // rejected outright, no override endpoint (spec 0002 key invariants)
        if (total - 1 < MODERATOR_FLOOR) {
            throw new Response(
                "Revoking this moderator would drop the count below the floor of two",
                { status: 409 }
            )
        }
        await db
            .delete(moderators)
            .where(eq(moderators.userLinkId, data.userLinkId))
        await logModerationAction({
            actorUserLinkId: userLinkId,
            action: "moderator.revoke",
            target: data.userLinkId,
        })
        return { success: true as const }
    })
