import { createServerFn } from "@tanstack/react-start"
import { getRequestHeaders } from "@tanstack/react-start/server"
import { queryOptions } from "@tanstack/react-query"
import { env } from "cloudflare:workers"
import { and, desc, eq, inArray, or, sql } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/db"
import { guide } from "@/schemas/guides"
import { resource } from "@/schemas/resources"
import { trustSignal } from "@/schemas/trust"
import { profile } from "@/schemas/profile"
import { SessionMiddleware } from "@/middleware/require-session"
import { ModeratorMiddleware } from "@/middleware/require-moderator"
import { getCurrentSession } from "@/middleware/session"
import { isModerator } from "@/lib/moderators"
import { assertNotDecoy } from "@/lib/private-data"
import { logModerationAction } from "@/lib/moderation-audit"
import { assertWriteRateLimit, assertReadRateLimit } from "@/lib/rate-limit"
import { assertTurnstileVerified } from "@/lib/turnstile"
import {
    ALLOWED_TYPES,
    MAX_FILE_BYTES,
    MAX_USER_QUOTA_BYTES,
    fileKey,
    getUsageBytes,
    sanitizeSvg,
    sniffExtension,
} from "@/lib/uploads"
import { getStoragePrefix } from "@/domains/uploads"
import { encodeCreatedAtCursor, decodeCreatedAtCursor } from "@/lib/cursor"
import {
    analyzeBodyContent,
    assertValidRelatedResourceIds,
    computeReadTime,
} from "./content-safety"
import {
    assertValidGuideCategory,
    getGuideSchema,
    listGuidesSchema,
    publishGuideSchema,
    rejectGuideSchema,
    submitGuideSchema,
    type GuideStatus,
} from "./types"

export type ListGuidesFilters = z.infer<typeof listGuidesSchema>

export const listGuidesQueryOptions = (filters: ListGuidesFilters = {}) =>
    queryOptions({
        queryKey: ["guides", filters],
        queryFn: () => listGuides({ data: filters }),
    })

export const getGuideQueryOptions = (id: string) =>
    queryOptions({
        queryKey: ["guide", id],
        // getGuide throws a 404 Response (spec 0004 AC-2); a Response
        // can't be serialized into the SSR stream's dehydrated query
        // cache (the same crash the resource detail page's not-found
        // case hit, spec 0003), so resolving to null here keeps the
        // not-found case a normal successful query result
        queryFn: async () => {
            try {
                return await getGuide({ data: { id } })
            } catch (error) {
                if (error instanceof Response) return null
                throw error
            }
        },
    })

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50
const FALLBACK_BYLINE = "Community contributor"

function getClientKey(): string {
    return getRequestHeaders().get("cf-connecting-ip") ?? "anonymous"
}

// GET /guides and GET /guides/:id both need "is this caller a
// moderator, if they even have a session" without ever requiring one
// (spec 0004 API surface): no middleware, read the session directly
async function currentModeratorId(): Promise<string | null> {
    const session = await getCurrentSession()
    if (!session) return null
    return (await isModerator(session.userLinkId))
        ? session.userLinkId
        : null
}

function bylineFrom(row: {
    displayName: string | null
    deletedAt: Date | null
} | null): string {
    if (!row || row.deletedAt || !row.displayName) {
        return FALLBACK_BYLINE
    }
    return row.displayName
}

export const listGuides = createServerFn({ method: "GET" })
    .validator(listGuidesSchema)
    .handler(async ({ data }) => {
        await assertReadRateLimit(getClientKey())

        let effectiveStatus: GuideStatus = "published"
        if (data.status && data.status !== "published") {
            if (!(await currentModeratorId())) {
                throw new Response("Forbidden", { status: 403 })
            }
            effectiveStatus = data.status
        }

        if (data.category) {
            assertValidGuideCategory(data.category)
        }

        const limit = Math.min(data.limit ?? DEFAULT_LIMIT, MAX_LIMIT)

        const conditions = [eq(guide.status, effectiveStatus)]
        if (data.category)
            conditions.push(eq(guide.category, data.category))
        if (data.search) {
            const q = `%${data.search.trim().toLowerCase()}%`
            conditions.push(
                or(
                    sql`lower(${guide.title}) LIKE ${q}`,
                    sql`lower(${guide.excerpt}) LIKE ${q}`
                )!
            )
        }
        const cursor = data.cursor ? decodeCreatedAtCursor(data.cursor) : null
        if (cursor) {
            conditions.push(
                sql`(${guide.createdAt}, ${guide.id}) < (${cursor.createdAt}, ${cursor.id})`
            )
        }

        const rows = await db
            .select({
                id: guide.id,
                title: guide.title,
                excerpt: guide.excerpt,
                category: guide.category,
                status: guide.status,
                wordCount: guide.wordCount,
                createdAt: guide.createdAt,
                displayName: profile.displayName,
                profileDeletedAt: profile.deletedAt,
                communityReviewed: trustSignal.communityReviewed,
                coSignCount: trustSignal.coSignCount,
                professionalVerified: trustSignal.professionalVerified,
            })
            .from(guide)
            .leftJoin(profile, eq(profile.userLinkId, guide.submittedBy))
            .leftJoin(
                trustSignal,
                and(
                    eq(trustSignal.contentType, "guide"),
                    eq(trustSignal.contentId, guide.id)
                )
            )
            .where(and(...conditions))
            .orderBy(desc(guide.createdAt), desc(guide.id))
            .limit(limit + 1)

        const hasMore = rows.length > limit
        const items = (hasMore ? rows.slice(0, limit) : rows).map(
            ({ displayName, profileDeletedAt, wordCount, ...row }) => ({
                ...row,
                contributor: bylineFrom({
                    displayName,
                    deletedAt: profileDeletedAt,
                }),
                readTime: computeReadTime(wordCount),
            })
        )
        const last = items.at(-1)
        return {
            items,
            nextCursor:
                hasMore && last
                    ? encodeCreatedAtCursor({
                          createdAt: rows[items.length - 1]!.createdAt,
                          id: last.id,
                      })
                    : null,
        }
    })

export const getGuide = createServerFn({ method: "GET" })
    .validator(getGuideSchema)
    .handler(async ({ data }) => {
        await assertReadRateLimit(getClientKey())

        const rows = await db
            .select({
                id: guide.id,
                title: guide.title,
                excerpt: guide.excerpt,
                category: guide.category,
                bodyContent: guide.bodyContent,
                relatedResourceIds: guide.relatedResourceIds,
                status: guide.status,
                wordCount: guide.wordCount,
                createdAt: guide.createdAt,
                displayName: profile.displayName,
                profileDeletedAt: profile.deletedAt,
            })
            .from(guide)
            .leftJoin(profile, eq(profile.userLinkId, guide.submittedBy))
            .where(eq(guide.id, data.id))
        const row = rows[0]
        if (!row) {
            throw new Response("Not found", { status: 404 })
        }
        if (row.status !== "published") {
            if (!(await currentModeratorId())) {
                throw new Response("Not found", { status: 404 })
            }
        }

        const trustRows = await db
            .select({
                communityReviewed: trustSignal.communityReviewed,
                coSignCount: trustSignal.coSignCount,
                referencesAvailable: trustSignal.referencesAvailable,
            })
            .from(trustSignal)
            .where(
                and(
                    eq(trustSignal.contentType, "guide"),
                    eq(trustSignal.contentId, row.id)
                )
            )
        // a guide's trust_signal row is created atomically with it at
        // submission (spec 0004 AC-3), so this always matches exactly
        // one row; this default only guards a data inconsistency that
        // shouldn't occur (same pattern as the resource detail page)
        const { communityReviewed, coSignCount, referencesAvailable } =
            trustRows[0] ?? {
                communityReviewed: false,
                coSignCount: 0,
                referencesAvailable: false,
            }

        const relatedIds: string[] = row.relatedResourceIds
            ? JSON.parse(row.relatedResourceIds)
            : []
        const relatedResources = relatedIds.length
            ? await db
                  .select({
                      id: resource.id,
                      name: resource.name,
                      category: resource.category,
                  })
                  .from(resource)
                  .where(
                      and(
                          inArray(resource.id, relatedIds),
                          eq(resource.status, "published")
                      )
                  )
            : []

        const { displayName, profileDeletedAt, wordCount, ...rest } = row
        return {
            ...rest,
            contributor: bylineFrom({
                displayName,
                deletedAt: profileDeletedAt,
            }),
            readTime: computeReadTime(wordCount),
            relatedResources,
            trust: {
                communityReviewed,
                coSignCount,
                referencesAvailable,
            },
        }
    })

export const submitGuide = createServerFn({ method: "POST" })
    .middleware([SessionMiddleware])
    .validator(submitGuideSchema)
    .handler(async ({ data, context }) => {
        const { userLinkId } = context
        assertNotDecoy(context)
        await assertWriteRateLimit(userLinkId)
        await assertTurnstileVerified(data.turnstileToken)
        assertValidGuideCategory(data.category)

        // validated before anything is written (spec 0004 AC-9): image
        // src allowlist + size cap inside analyzeBodyContent, id
        // format + count cap inside assertValidRelatedResourceIds
        const { wordCount, hasLink } = analyzeBodyContent(data.bodyContent)
        const relatedResourceIds = assertValidRelatedResourceIds(
            data.relatedResourceIds
        )

        const id = crypto.randomUUID()
        const now = new Date()

        // guide + its trust_signal are created together, including
        // referencesAvailable computed inline: either both land or
        // neither does (spec 0004 AC-3, Key invariants). Inserts the
        // trust_signal row directly rather than calling the shared
        // createTrustSignal/setReferencesAvailable (both are
        // already-awaited functions, not usable inside a batch of
        // un-executed query builders), same reasoning as resources'
        // submit.
        await db.batch([
            db.insert(guide).values({
                id,
                title: data.title,
                excerpt: data.excerpt,
                category: data.category,
                bodyContent: JSON.stringify(data.bodyContent),
                wordCount,
                relatedResourceIds: relatedResourceIds.length
                    ? JSON.stringify(relatedResourceIds)
                    : null,
                status: "pending",
                submittedBy: userLinkId,
                createdAt: now,
                updatedAt: now,
            }),
            db.insert(trustSignal).values({
                id: crypto.randomUUID(),
                contentType: "guide",
                contentId: id,
                submittedAt: now,
                submittedBy: userLinkId,
                referencesAvailable: hasLink,
            }),
        ])

        return { id, status: "pending" as const }
    })

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

// deliberately not Turnstile-gated, unlike every other write in this
// codebase: a Turnstile token is single-use, but composing a guide
// means uploading several images before ever reaching a final submit;
// session + write rate limit + the existing per-account quota gate
// this instead (spec 0004 Security model)
export const uploadGuideImage = createServerFn({ method: "POST" })
    .middleware([SessionMiddleware])
    .validator((data: unknown) => {
        if (!(data instanceof FormData)) {
            throw new Response("Expected multipart/form-data", {
                status: 400,
            })
        }
        return data
    })
    .handler(async ({ data, context }) => {
        const { userLinkId } = context
        assertNotDecoy(context)
        await assertWriteRateLimit(userLinkId)

        const file = data.get("file")
        if (!(file instanceof File)) {
            throw new Response("Missing file", { status: 400 })
        }
        if (file.size > MAX_FILE_BYTES) {
            throw new Response("File exceeds the 10 MB limit", {
                status: 413,
            })
        }

        const bytes = new Uint8Array(await file.arrayBuffer())
        const ext = sniffExtension(bytes)
        if (!ext) {
            throw new Response("Disallowed file type", { status: 422 })
        }

        const storagePrefix = await getStoragePrefix(userLinkId)
        const usage = await getUsageBytes(env.R2, storagePrefix)
        if (usage + file.size > MAX_USER_QUOTA_BYTES) {
            throw new Response("Over storage quota", { status: 413 })
        }

        const body: BodyInit =
            ext === "svg"
                ? await sanitizeSvg(new TextDecoder().decode(bytes))
                : bytes
        const key = fileKey(storagePrefix, file.name)
        await env.R2.put(key, body, {
            httpMetadata: { contentType: ALLOWED_TYPES[ext] },
        })

        return { key, url: `/api/uploads/${key}` }
    })
