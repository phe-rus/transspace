import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import {
    supportPost,
    supportPostRead,
    supportUpdate,
} from "@/schemas/support"
import { ModeratorMiddleware } from "@/middleware/require-moderator"
import { assertNotDecoy } from "@/lib/private-data"
import { assertWriteRateLimit } from "@/lib/rate-limit"
import { logModerationAction } from "@/lib/moderation-audit"
import { createTrustSignal } from "@/domains/trust-signals"
import { isMoreRestrictive } from "@/data/support-types"
import {
    escalateTierSupportPostSchema,
    pauseSupportPostSchema,
    publishSupportPostSchema,
    reactivateSupportPostSchema,
    rejectSupportPostSchema,
} from "../types"
import { assertSelfReviewAllowed } from "./shared"

async function loadPostOrThrow(id: string) {
    const [row] = await db
        .select({
            status: supportPost.status,
            authorUserLinkId: supportPost.authorUserLinkId,
            visibilityTier: supportPost.visibilityTier,
        })
        .from(supportPost)
        .where(eq(supportPost.id, id))
    if (!row) {
        throw new Response("Not found", { status: 404 })
    }
    return row
}

// a statement, not a call, so a stage change can run it in the same batch
// as the status update. Kept in this file, next to the only handlers that
// use it, so no client-reachable module holds a top-level use of db
const clearSupportPostReads = (postId: string) =>
    db.delete(supportPostRead).where(eq(supportPostRead.supportPostId, postId))

export const publishSupportPost = createServerFn({ method: "POST" })
    .middleware([ModeratorMiddleware])
    .validator(publishSupportPostSchema)
    .handler(async ({ data, context }) => {
        const { userLinkId } = context
        assertNotDecoy(context)
        await assertWriteRateLimit(userLinkId)

        const row = await loadPostOrThrow(data.id)
        await assertSelfReviewAllowed(userLinkId, row.authorUserLinkId)
        if (row.status !== "pending") {
            throw new Response("Not pending", { status: 422 })
        }

        const now = new Date()
        await db.batch([
            db
                .update(supportPost)
                .set({
                    status: "published",
                    moderatedBy: userLinkId,
                    moderatedAt: now,
                    updatedAt: now,
                })
                .where(eq(supportPost.id, data.id)),
            clearSupportPostReads(data.id),
        ])

        // spec 0005 AC-6: the trustSignal row is created at publish time,
        // not submission, so an unreviewed financial ask cannot
        // accumulate cosigns before a moderator has seen it (a deliberate
        // deviation from resource/guide, which create it at submit time)
        await createTrustSignal(
            "supportPost",
            data.id,
            row.authorUserLinkId
        )

        await logModerationAction({
            actorUserLinkId: userLinkId,
            action: "supportPost.publish",
            target: data.id,
        })

        return { id: data.id, status: "published" as const }
    })

export const rejectSupportPost = createServerFn({ method: "POST" })
    .middleware([ModeratorMiddleware])
    .validator(rejectSupportPostSchema)
    .handler(async ({ data, context }) => {
        const { userLinkId } = context
        assertNotDecoy(context)
        await assertWriteRateLimit(userLinkId)

        const row = await loadPostOrThrow(data.id)
        await assertSelfReviewAllowed(userLinkId, row.authorUserLinkId)
        // reachable from pending (screening) or published (a takedown),
        // never from rejected again (spec 0005 State transitions)
        if (row.status === "rejected") {
            throw new Response("Already rejected", { status: 422 })
        }

        const now = new Date()
        await db.batch([
            db
                .update(supportPost)
                .set({
                    status: "rejected",
                    moderatedBy: userLinkId,
                    moderatedAt: now,
                    updatedAt: now,
                })
                .where(eq(supportPost.id, data.id)),
            db.insert(supportUpdate).values({
                id: crypto.randomUUID(),
                supportPostId: data.id,
                authorUserLinkId: userLinkId,
                kind: "rejection_reason",
                body: data.reason,
                createdAt: now,
            }),
            clearSupportPostReads(data.id),
        ])

        await logModerationAction({
            actorUserLinkId: userLinkId,
            action: "supportPost.reject",
            target: data.id,
        })

        return { id: data.id, status: "rejected" as const }
    })

export const pauseSupportPost = createServerFn({ method: "POST" })
    .middleware([ModeratorMiddleware])
    .validator(pauseSupportPostSchema)
    .handler(async ({ data, context }) => {
        const { userLinkId } = context
        assertNotDecoy(context)
        await assertWriteRateLimit(userLinkId)

        const row = await loadPostOrThrow(data.id)
        await assertSelfReviewAllowed(userLinkId, row.authorUserLinkId)
        if (row.status !== "published") {
            throw new Response("Not published", { status: 422 })
        }

        const now = new Date()
        await db.batch([
            db
                .update(supportPost)
                .set({ status: "paused", updatedAt: now })
                .where(eq(supportPost.id, data.id)),
            db.insert(supportUpdate).values({
                id: crypto.randomUUID(),
                supportPostId: data.id,
                authorUserLinkId: userLinkId,
                kind: "pause_reason",
                body: data.reason,
                createdAt: now,
            }),
            clearSupportPostReads(data.id),
        ])

        await logModerationAction({
            actorUserLinkId: userLinkId,
            action: "supportPost.pause",
            target: data.id,
        })

        return { id: data.id, status: "paused" as const }
    })

export const reactivateSupportPost = createServerFn({ method: "POST" })
    .middleware([ModeratorMiddleware])
    .validator(reactivateSupportPostSchema)
    .handler(async ({ data, context }) => {
        const { userLinkId } = context
        assertNotDecoy(context)
        await assertWriteRateLimit(userLinkId)

        const row = await loadPostOrThrow(data.id)
        // spec 0005 AC-9: any moderator, not necessarily the one who
        // paused it, but never the post's own author (H10)
        await assertSelfReviewAllowed(userLinkId, row.authorUserLinkId)
        if (row.status !== "paused") {
            throw new Response("Not paused", { status: 409 })
        }

        const now = new Date()
        await db
            .update(supportPost)
            .set({ status: "published", updatedAt: now })
            .where(eq(supportPost.id, data.id))
        if (data.note) {
            await db.insert(supportUpdate).values({
                id: crypto.randomUUID(),
                supportPostId: data.id,
                authorUserLinkId: userLinkId,
                kind: "reactivation_note",
                body: data.note,
                createdAt: now,
            })
        }

        await logModerationAction({
            actorUserLinkId: userLinkId,
            action: "supportPost.reactivate",
            target: data.id,
        })

        return { id: data.id, status: "published" as const }
    })

export const escalateTierSupportPost = createServerFn({ method: "POST" })
    .middleware([ModeratorMiddleware])
    .validator(escalateTierSupportPostSchema)
    .handler(async ({ data, context }) => {
        const { userLinkId } = context
        assertNotDecoy(context)
        await assertWriteRateLimit(userLinkId)

        const row = await loadPostOrThrow(data.id)
        await assertSelfReviewAllowed(userLinkId, row.authorUserLinkId)
        // spec 0005 AC-5: a moderator may only escalate (move to a more
        // restrictive tier); only the author may move left, via edit
        if (
            !isMoreRestrictive(
                data.visibilityTier,
                row.visibilityTier as typeof data.visibilityTier
            )
        ) {
            throw new Response(
                "Only escalation to a more restrictive tier is allowed",
                { status: 422 }
            )
        }

        await db
            .update(supportPost)
            .set({
                visibilityTier: data.visibilityTier,
                updatedAt: new Date(),
            })
            .where(eq(supportPost.id, data.id))

        await logModerationAction({
            actorUserLinkId: userLinkId,
            action: "supportPost.escalateTier",
            target: data.id,
        })

        return {
            id: data.id,
            visibilityTier: data.visibilityTier,
        }
    })
