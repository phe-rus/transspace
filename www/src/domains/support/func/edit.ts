import { createServerFn } from "@tanstack/react-start"
import { and, eq } from "drizzle-orm"
import { db } from "@/db"
import { supportClaim, supportPost, supportUpdate } from "@/schemas/support"
import { SessionMiddleware } from "@/middleware/require-session"
import { assertNotDecoy } from "@/lib/private-data"
import { assertWriteRateLimit } from "@/lib/rate-limit"
import { assertTurnstileVerified } from "@/lib/turnstile"
import type { SupportPostType } from "@/data/support-types"
import {
    editSupportPostSchema,
    fulfillSupportPostSchema,
    parseStructuredDetails,
    withdrawSupportPostSchema,
} from "../types"

async function loadOwnPostOrThrow(id: string, userLinkId: string) {
    const [row] = await db
        .select()
        .from(supportPost)
        .where(eq(supportPost.id, id))
    if (!row) {
        throw new Response("Not found", { status: 404 })
    }
    if (row.authorUserLinkId !== userLinkId) {
        throw new Response("Forbidden", { status: 403 })
    }
    return row
}

// spec 0005 AC-8: closing (fulfilled or withdrawn) auto-declines only the
// still-interested claims; an already-assigned claim is left untouched
async function declineInterestedClaims(supportPostId: string) {
    await db
        .update(supportClaim)
        .set({ status: "declined" })
        .where(
            and(
                eq(supportClaim.supportPostId, supportPostId),
                eq(supportClaim.status, "interested")
            )
        )
}

export const editSupportPost = createServerFn({ method: "POST" })
    .middleware([SessionMiddleware])
    .validator(editSupportPostSchema)
    .handler(async ({ data, context }) => {
        const { userLinkId } = context
        assertNotDecoy(context)
        await assertWriteRateLimit(userLinkId)
        await assertTurnstileVerified(data.turnstileToken)

        const row = await loadOwnPostOrThrow(data.id, userLinkId)
        if (row.status === "paused") {
            throw new Response("Cannot edit while paused", {
                status: 409,
            })
        }
        if (row.status !== "pending" && row.status !== "published") {
            throw new Response(
                "Cannot edit a post in this status",
                { status: 409 }
            )
        }

        const structuredDetails = data.structuredDetails
            ? parseStructuredDetails(
                  row.type as SupportPostType,
                  data.structuredDetails
              )
            : undefined

        const wasPublished = row.status === "published"
        await db
            .update(supportPost)
            .set({
                title: data.title ?? row.title,
                structuredDetails: structuredDetails
                    ? JSON.stringify(structuredDetails)
                    : row.structuredDetails,
                visibilityTier: data.visibilityTier ?? row.visibilityTier,
                // spec 0005 AC-12: an edit to a published post returns it
                // to pending for re-review, clearing who moderated it;
                // claims and update history are left untouched
                status: wasPublished ? "pending" : row.status,
                moderatedBy: wasPublished ? null : row.moderatedBy,
                moderatedAt: wasPublished ? null : row.moderatedAt,
                updatedAt: new Date(),
            })
            .where(eq(supportPost.id, data.id))

        return {
            id: data.id,
            status: wasPublished ? ("pending" as const) : row.status,
        }
    })

export const withdrawSupportPost = createServerFn({ method: "POST" })
    .middleware([SessionMiddleware])
    .validator(withdrawSupportPostSchema)
    .handler(async ({ data, context }) => {
        const { userLinkId } = context
        assertNotDecoy(context)
        await assertWriteRateLimit(userLinkId)
        await assertTurnstileVerified(data.turnstileToken)

        const row = await loadOwnPostOrThrow(data.id, userLinkId)
        if (
            row.status !== "pending" &&
            row.status !== "published" &&
            row.status !== "paused"
        ) {
            throw new Response(
                "This post is already closed",
                { status: 409 }
            )
        }

        const now = new Date()
        await db
            .update(supportPost)
            .set({ status: "withdrawn", updatedAt: now })
            .where(eq(supportPost.id, data.id))
        if (data.reason) {
            await db.insert(supportUpdate).values({
                id: crypto.randomUUID(),
                supportPostId: data.id,
                authorUserLinkId: userLinkId,
                kind: "withdrawal_reason",
                body: data.reason,
                createdAt: now,
            })
        }
        await declineInterestedClaims(data.id)

        return { id: data.id, status: "withdrawn" as const }
    })

export const fulfillSupportPost = createServerFn({ method: "POST" })
    .middleware([SessionMiddleware])
    .validator(fulfillSupportPostSchema)
    .handler(async ({ data, context }) => {
        const { userLinkId } = context
        assertNotDecoy(context)
        await assertWriteRateLimit(userLinkId)
        await assertTurnstileVerified(data.turnstileToken)

        const row = await loadOwnPostOrThrow(data.id, userLinkId)
        if (row.status !== "published" && row.status !== "paused") {
            throw new Response(
                "Only a published or paused post can be marked fulfilled",
                { status: 409 }
            )
        }

        await db
            .update(supportPost)
            .set({ status: "fulfilled", updatedAt: new Date() })
            .where(eq(supportPost.id, data.id))
        await declineInterestedClaims(data.id)

        return { id: data.id, status: "fulfilled" as const }
    })
