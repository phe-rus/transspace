import { createServerFn } from "@tanstack/react-start"
import { getRequestHeaders } from "@tanstack/react-start/server"
import { and, count, eq, gte } from "drizzle-orm"
import { db } from "@/db"
import { trustSignal, trustCoSign } from "@/schemas/trust"
import { userLink } from "@/schemas/user-link"
import { SessionMiddleware } from "@/middleware/require-session"
import { ModeratorMiddleware } from "@/middleware/require-moderator"
import { logModerationAction } from "@/lib/moderation-audit"
import { assertWriteRateLimit, assertReadRateLimit } from "@/lib/rate-limit"
import { assertTurnstileVerified } from "@/lib/turnstile"
import {
    assertValidContentType,
    CO_SIGN_ACCOUNT_AGE_MS,
    CO_SIGN_DAILY_LIMIT,
    COMMUNITY_REVIEW_THRESHOLD,
    type ContentType,
    coSignSchema,
    disputeTrustSignalSchema,
    getTrustSignalSchema,
    verifyTrustSignalSchema,
} from "./types"

// called from a future content type's own save path, never invented per
// content type (spec 0003 AC-1, Build plan task 2)
export async function createTrustSignal(
    contentType: ContentType,
    contentId: string,
    submittedBy: string
): Promise<void> {
    await db.insert(trustSignal).values({
        id: crypto.randomUUID(),
        contentType,
        contentId,
        submittedAt: new Date(),
        submittedBy,
    })
}

// the one shared function that sets referencesAvailable; a content
// type's own save path calls this directly, there is no HTTP caller
// (spec 0003 AC-3, Build plan task 4)
export async function setReferencesAvailable(
    contentType: ContentType,
    contentId: string,
    value: boolean
): Promise<void> {
    await db
        .update(trustSignal)
        .set({ referencesAvailable: value })
        .where(
            and(
                eq(trustSignal.contentType, contentType),
                eq(trustSignal.contentId, contentId)
            )
        )
}

// always derived fresh from the current row counts, never incrementally
// tracked, so it can never drift from what the co signs and the dispute
// flag actually support (spec 0003 key invariants)
async function recomputeTrustSignal(
    trustSignalId: string
): Promise<{ communityReviewed: boolean; coSignCount: number }> {
    const [{ coSignCount }] = await db
        .select({ coSignCount: count() })
        .from(trustCoSign)
        .where(eq(trustCoSign.trustSignalId, trustSignalId))
    const [row] = await db
        .select({ disputed: trustSignal.disputed })
        .from(trustSignal)
        .where(eq(trustSignal.id, trustSignalId))
    const communityReviewed =
        coSignCount >= COMMUNITY_REVIEW_THRESHOLD && !row?.disputed
    await db
        .update(trustSignal)
        .set({ coSignCount, communityReviewed })
        .where(eq(trustSignal.id, trustSignalId))
    return { communityReviewed, coSignCount }
}

function getClientKey(): string {
    return getRequestHeaders().get("cf-connecting-ip") ?? "anonymous"
}

export const getTrustSignal = createServerFn({ method: "GET" })
    .validator(getTrustSignalSchema)
    .handler(async ({ data }) => {
        assertValidContentType(data.contentType)
        await assertReadRateLimit(getClientKey())
        const [row] = await db
            .select({
                submittedAt: trustSignal.submittedAt,
                communityReviewed: trustSignal.communityReviewed,
                coSignCount: trustSignal.coSignCount,
                referencesAvailable: trustSignal.referencesAvailable,
                professionalVerified: trustSignal.professionalVerified,
                disputed: trustSignal.disputed,
                lastReviewedAt: trustSignal.lastReviewedAt,
            })
            .from(trustSignal)
            .where(
                and(
                    eq(trustSignal.contentType, data.contentType),
                    eq(trustSignal.contentId, data.contentId)
                )
            )
        if (!row) {
            throw new Response("Not found", { status: 404 })
        }
        return row
    })

export const coSignTrustSignal = createServerFn({ method: "POST" })
    .middleware([SessionMiddleware])
    .validator(coSignSchema)
    .handler(async ({ data, context: { userLinkId } }) => {
        assertValidContentType(data.contentType)
        await assertWriteRateLimit(userLinkId)
        await assertTurnstileVerified(data.turnstileToken)

        const [signal] = await db
            .select({
                id: trustSignal.id,
                submittedBy: trustSignal.submittedBy,
            })
            .from(trustSignal)
            .where(
                and(
                    eq(trustSignal.contentType, data.contentType),
                    eq(trustSignal.contentId, data.contentId)
                )
            )
        if (!signal) {
            throw new Response("Not found", { status: 404 })
        }
        if (signal.submittedBy === userLinkId) {
            throw new Response("Cannot co-sign your own content", {
                status: 403,
            })
        }

        const [signer] = await db
            .select({ createdAt: userLink.createdAt })
            .from(userLink)
            .where(eq(userLink.id, userLinkId))
        if (
            !signer ||
            Date.now() - signer.createdAt.getTime() <
                CO_SIGN_ACCOUNT_AGE_MS
        ) {
            throw new Response(
                "Account too new to co-sign",
                { status: 403 }
            )
        }

        const startOfDay = new Date()
        startOfDay.setUTCHours(0, 0, 0, 0)
        const [{ todayCount }] = await db
            .select({ todayCount: count() })
            .from(trustCoSign)
            .where(
                and(
                    eq(trustCoSign.userLinkId, userLinkId),
                    gte(trustCoSign.createdAt, startOfDay)
                )
            )
        if (todayCount >= CO_SIGN_DAILY_LIMIT) {
            throw new Response(
                "Daily co-sign limit reached",
                { status: 429 }
            )
        }

        const [existing] = await db
            .select({ userLinkId: trustCoSign.userLinkId })
            .from(trustCoSign)
            .where(
                and(
                    eq(trustCoSign.trustSignalId, signal.id),
                    eq(trustCoSign.userLinkId, userLinkId)
                )
            )
        if (existing) {
            throw new Response("Already co-signed", {
                status: 409,
            })
        }

        await db.insert(trustCoSign).values({
            trustSignalId: signal.id,
            userLinkId,
            createdAt: new Date(),
        })

        return recomputeTrustSignal(signal.id)
    })

export const verifyTrustSignal = createServerFn({ method: "POST" })
    .middleware([ModeratorMiddleware])
    .validator(verifyTrustSignalSchema)
    .handler(async ({ data, context: { userLinkId } }) => {
        assertValidContentType(data.contentType)
        await assertWriteRateLimit(userLinkId)
        await assertTurnstileVerified(data.turnstileToken)

        const [signal] = await db
            .select({ id: trustSignal.id })
            .from(trustSignal)
            .where(
                and(
                    eq(trustSignal.contentType, data.contentType),
                    eq(trustSignal.contentId, data.contentId)
                )
            )
        if (!signal) {
            throw new Response("Not found", { status: 404 })
        }

        await db
            .update(trustSignal)
            .set({
                professionalVerified: true,
                professionalVerifiedBy: userLinkId,
                lastReviewedAt: new Date(),
            })
            .where(eq(trustSignal.id, signal.id))

        await logModerationAction({
            actorUserLinkId: userLinkId,
            action: "trustSignal.verify",
            target: `${data.contentType}:${data.contentId}`,
        })

        return {
            success: true as const,
            professionalVerified: true as const,
        }
    })

export const disputeTrustSignal = createServerFn({ method: "POST" })
    .middleware([ModeratorMiddleware])
    .validator(disputeTrustSignalSchema)
    .handler(async ({ data, context: { userLinkId } }) => {
        assertValidContentType(data.contentType)
        await assertWriteRateLimit(userLinkId)
        await assertTurnstileVerified(data.turnstileToken)

        const [signal] = await db
            .select({ id: trustSignal.id })
            .from(trustSignal)
            .where(
                and(
                    eq(trustSignal.contentType, data.contentType),
                    eq(trustSignal.contentId, data.contentId)
                )
            )
        if (!signal) {
            throw new Response("Not found", { status: 404 })
        }

        await db
            .update(trustSignal)
            .set({
                disputed: data.disputed,
                lastReviewedAt: new Date(),
            })
            .where(eq(trustSignal.id, signal.id))

        await logModerationAction({
            actorUserLinkId: userLinkId,
            action: data.disputed
                ? "trustSignal.dispute"
                : "trustSignal.disputeClear",
            target: `${data.contentType}:${data.contentId}`,
        })

        const recomputed = await recomputeTrustSignal(signal.id)
        return {
            success: true as const,
            disputed: data.disputed,
            ...recomputed,
        }
    })
