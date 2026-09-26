import { createServerFn } from "@tanstack/react-start"
import { queryOptions } from "@tanstack/react-query"
import { and, desc, eq } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/db"
import { supportClaim, supportPost } from "@/schemas/support"
import { userLink } from "@/schemas/user-link"
import { SessionMiddleware } from "@/middleware/require-session"
import { assertNotDecoy } from "@/lib/private-data"
import { assertWriteRateLimit, assertReadRateLimit } from "@/lib/rate-limit"
import { logModerationAction } from "@/lib/moderation-audit"
import { isModerator } from "@/lib/moderators"
import { getClientKey } from "./shared"
import {
    assignClaimSchema,
    createClaimSchema,
    declineClaimSchema,
    withdrawClaimSchema,
} from "../types"

async function loadClaimOrThrow(supportPostId: string, claimId: string) {
    const [claim] = await db
        .select()
        .from(supportClaim)
        .where(
            and(
                eq(supportClaim.id, claimId),
                eq(supportClaim.supportPostId, supportPostId)
            )
        )
    if (!claim) {
        throw new Response("Not found", { status: 404 })
    }
    return claim
}

// spec 0005 AC-10: the post's author or any moderator may assign/decline.
// Not exported: an exported plain function that touches `db` (via
// isModerator) can't be proven handler-only by the server-fn client
// split, so it and its db import chain leak into the client bundle
// (this exact bug, caught live: "cloudflare:workers" unresolved for the
// browser). Keeping this module-private is what lets the compiler strip
// it correctly.
async function assertCanManageClaims(
    postAuthorUserLinkId: string,
    userLinkId: string
): Promise<void> {
    if (postAuthorUserLinkId === userLinkId) return
    if (await isModerator(userLinkId)) return
    throw new Response("Forbidden", { status: 403 })
}

const listClaimsSchema = z.object({ id: z.string().min(1) })

export const listSupportClaimsQueryOptions = (id: string) =>
    queryOptions({
        queryKey: ["support-claims", id],
        queryFn: () => listSupportClaims({ data: { id } }),
    })

// spec 0005 AC-10: only the post's author or a moderator sees who has
// offered to help, so they can pick one to assign
export const listSupportClaims = createServerFn({ method: "GET" })
    .middleware([SessionMiddleware])
    .validator(listClaimsSchema)
    .handler(async ({ data, context: { userLinkId } }) => {
        await assertReadRateLimit(getClientKey())

        const [post] = await db
            .select({ authorUserLinkId: supportPost.authorUserLinkId })
            .from(supportPost)
            .where(eq(supportPost.id, data.id))
        if (!post) {
            throw new Response("Not found", { status: 404 })
        }
        await assertCanManageClaims(post.authorUserLinkId, userLinkId)

        return db
            .select({
                id: supportClaim.id,
                helperUserLinkId: supportClaim.helperUserLinkId,
                helperDisplayName: userLink.displayName,
                status: supportClaim.status,
                message: supportClaim.message,
                createdAt: supportClaim.createdAt,
            })
            .from(supportClaim)
            .leftJoin(userLink, eq(userLink.id, supportClaim.helperUserLinkId))
            .where(eq(supportClaim.supportPostId, data.id))
            .orderBy(desc(supportClaim.createdAt))
    })

export const createClaim = createServerFn({ method: "POST" })
    .middleware([SessionMiddleware])
    .validator(createClaimSchema)
    .handler(async ({ data, context }) => {
        const { userLinkId } = context
        assertNotDecoy(context)
        await assertWriteRateLimit(userLinkId)

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
        if (post.status !== "published") {
            throw new Response("Not open for claims", { status: 409 })
        }
        if (post.authorUserLinkId === userLinkId) {
            throw new Response(
                "You cannot claim your own post",
                { status: 403 }
            )
        }

        try {
            await db.insert(supportClaim).values({
                id: crypto.randomUUID(),
                supportPostId: data.id,
                helperUserLinkId: userLinkId,
                status: "interested",
                message: data.message ?? null,
                createdAt: new Date(),
            })
        } catch (error) {
            if (error instanceof Error && error.message.includes("UNIQUE")) {
                throw new Response("Already claimed", { status: 409 })
            }
            throw error
        }

        return { supportPostId: data.id, status: "interested" as const }
    })

export const withdrawClaim = createServerFn({ method: "POST" })
    .middleware([SessionMiddleware])
    .validator(withdrawClaimSchema)
    .handler(async ({ data, context }) => {
        const { userLinkId } = context
        assertNotDecoy(context)
        await assertWriteRateLimit(userLinkId)

        const claim = await loadClaimOrThrow(data.id, data.claimId)
        if (claim.helperUserLinkId !== userLinkId) {
            throw new Response("Forbidden", { status: 403 })
        }

        await db
            .update(supportClaim)
            .set({ status: "withdrawn" })
            .where(eq(supportClaim.id, data.claimId))

        return { id: data.claimId, status: "withdrawn" as const }
    })

export const assignClaim = createServerFn({ method: "POST" })
    .middleware([SessionMiddleware])
    .validator(assignClaimSchema)
    .handler(async ({ data, context }) => {
        const { userLinkId } = context
        assertNotDecoy(context)
        await assertWriteRateLimit(userLinkId)

        const [post] = await db
            .select({ authorUserLinkId: supportPost.authorUserLinkId })
            .from(supportPost)
            .where(eq(supportPost.id, data.id))
        if (!post) {
            throw new Response("Not found", { status: 404 })
        }
        await assertCanManageClaims(post.authorUserLinkId, userLinkId)

        const claim = await loadClaimOrThrow(data.id, data.claimId)
        if (claim.status !== "interested") {
            throw new Response(
                "Only an interested claim can be assigned",
                { status: 409 }
            )
        }

        const now = new Date()
        // spec 0005 AC-10: at most one assigned claim per post; assigning
        // a new one first resets the previous assignee to interested
        await db.batch([
            db
                .update(supportClaim)
                .set({
                    status: "interested",
                    assignedAt: null,
                    assignedBy: null,
                })
                .where(
                    and(
                        eq(supportClaim.supportPostId, data.id),
                        eq(supportClaim.status, "assigned")
                    )
                ),
            db
                .update(supportClaim)
                .set({
                    status: "assigned",
                    assignedAt: now,
                    assignedBy: userLinkId,
                })
                .where(eq(supportClaim.id, data.claimId)),
        ])

        if (await isModerator(userLinkId)) {
            await logModerationAction({
                actorUserLinkId: userLinkId,
                action: "supportPost.assignClaim",
                target: data.claimId,
            })
        }

        return { id: data.claimId, status: "assigned" as const }
    })

export const declineClaim = createServerFn({ method: "POST" })
    .middleware([SessionMiddleware])
    .validator(declineClaimSchema)
    .handler(async ({ data, context }) => {
        const { userLinkId } = context
        assertNotDecoy(context)
        await assertWriteRateLimit(userLinkId)

        const [post] = await db
            .select({ authorUserLinkId: supportPost.authorUserLinkId })
            .from(supportPost)
            .where(eq(supportPost.id, data.id))
        if (!post) {
            throw new Response("Not found", { status: 404 })
        }
        await assertCanManageClaims(post.authorUserLinkId, userLinkId)

        await loadClaimOrThrow(data.id, data.claimId)
        await db
            .update(supportClaim)
            .set({ status: "declined" })
            .where(eq(supportClaim.id, data.claimId))

        return { id: data.claimId, status: "declined" as const }
    })
