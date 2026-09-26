import { createServerFn } from "@tanstack/react-start"
import { queryOptions } from "@tanstack/react-query"
import {
    and,
    asc,
    count,
    desc,
    eq,
    gte,
    inArray,
    lt,
    notExists,
    or,
    sql,
} from "drizzle-orm"
import { z } from "zod"
import { db } from "@/db"
import {
    supportClaim,
    supportPost,
    supportPostRead,
    supportUpdate,
} from "@/schemas/support"
import { getCurrentSession } from "@/middleware/session"
import { ModeratorMiddleware } from "@/middleware/require-moderator"
import { assertReadRateLimit } from "@/lib/rate-limit"
import { encodeCreatedAtCursor, decodeCreatedAtCursor } from "@/lib/cursor"
import {
    COUNTRY_AGNOSTIC_SUPPORT_TYPES,
    type SupportVisibilityTier,
} from "@/data/support-types"
import { listSupportPostsSchema } from "../types"
import {
    currentModeratorId,
    DEFAULT_LIMIT,
    getClientKey,
    getVisitorCountryCode,
    MAX_LIMIT,
    resolveContentVisibility,
} from "./shared"

type SupportPostRow = {
    id: string
    type: string
    direction: string
    isUrgent: boolean
    isRecurring: boolean
    title: string
    visibilityTier: string
    status: string
    authorUserLinkId: string
    requestorCountryCode: string | null
    structuredDetails: string
    moderatedBy: string | null
    moderatedAt: Date | null
    createdAt: Date
    updatedAt: Date
}

type RedactedItem = {
    visibility: "redacted"
    id: string
    type: string
    direction: string
    isUrgent: boolean
    isRecurring: boolean
    title: string
    createdAt: Date
}

// structuredDetails stays a raw JSON string here, same as
// resource/guide's list and detail reads; the client parses it, so the
// server function's return type stays concretely serializable
type FullItem = SupportPostRow & { visibility: "full" }

function fullRow(row: SupportPostRow): FullItem {
    return { ...row, visibility: "full" }
}

function redactedRow(row: SupportPostRow): RedactedItem {
    return {
        visibility: "redacted",
        id: row.id,
        type: row.type,
        direction: row.direction,
        isUrgent: row.isUrgent,
        isRecurring: row.isRecurring,
        title: row.title,
        createdAt: row.createdAt,
    }
}

export type ListSupportPostsFilters = z.infer<typeof listSupportPostsSchema>

export const listSupportPostsQueryOptions = (
    filters: ListSupportPostsFilters = {}
) =>
    queryOptions({
        queryKey: ["support-posts", filters],
        queryFn: () => listSupportPosts({ data: filters }),
    })

export const listSupportPosts = createServerFn({ method: "GET" })
    .validator(listSupportPostsSchema)
    .handler(async ({ data }) => {
        await assertReadRateLimit(getClientKey())

        const session = await getCurrentSession()
        const isSignedIn = Boolean(session)
        const moderatorId = await currentModeratorId()
        const isModerator = Boolean(moderatorId)
        const mine = Boolean(data.mine)

        if (mine && !session) {
            throw new Response("Unauthorized", { status: 401 })
        }
        if (
            !mine &&
            data.status &&
            data.status !== "published" &&
            !isModerator
        ) {
            throw new Response("Forbidden", { status: 403 })
        }

        const limit = Math.min(data.limit ?? DEFAULT_LIMIT, MAX_LIMIT)
        const conditions = []

        if (mine) {
            conditions.push(
                eq(supportPost.authorUserLinkId, session!.userLinkId)
            )
            if (data.status) conditions.push(eq(supportPost.status, data.status))
        } else if (data.status) {
            conditions.push(eq(supportPost.status, data.status))
        } else if (data.includeFulfilled) {
            conditions.push(
                sql`${supportPost.status} in ('published', 'fulfilled')`
            )
        } else {
            conditions.push(eq(supportPost.status, "published"))
        }

        if (data.type) conditions.push(eq(supportPost.type, data.type))
        if (data.direction)
            conditions.push(eq(supportPost.direction, data.direction))
        // moderation queue's soft country filter: a moderator asking
        // for their own country still sees every country-agnostic
        // (general/skills) post alongside it, never a hard exclusion
        // for anyone else calling this (engineer's explicit call,
        // 2026-09-25)
        if (data.countryCode) {
            conditions.push(
                or(
                    eq(supportPost.requestorCountryCode, data.countryCode),
                    inArray(supportPost.type, COUNTRY_AGNOSTIC_SUPPORT_TYPES)
                )!
            )
        }

        const cursor = data.cursor ? decodeCreatedAtCursor(data.cursor) : null
        if (cursor) {
            conditions.push(
                sql`(${supportPost.createdAt}, ${supportPost.id}) < (${cursor.createdAt}, ${cursor.id})`
            )
        }

        const rows = await db
            .select()
            .from(supportPost)
            .where(and(...conditions))
            .orderBy(desc(supportPost.createdAt), desc(supportPost.id))
            .limit(limit + 1)

        const hasMore = rows.length > limit
        const page = hasMore ? rows.slice(0, limit) : rows

        const countryCode = isSignedIn ? null : getVisitorCountryCode()
        const items: Array<RedactedItem | FullItem> =
            mine || isModerator
                ? page.map(fullRow)
                : filterAndProject(page, { isSignedIn, countryCode })

        const last = page.at(-1)
        return {
            items,
            nextCursor: hasMore && last ? encodeCreatedAtCursor(last) : null,
        }
    })

// spec 0005 AC-4/AC-18: a caller with no elevated access never sees a
// private post in a list at all, and a critical-tier post is dropped
// entirely (not shown as a locked card) when it would otherwise be
// locked for them; everything else is projected full or redacted per
// row, same rule as the detail read
function filterAndProject(
    rows: SupportPostRow[],
    opts: { isSignedIn: boolean; countryCode: string | null }
): Array<RedactedItem | FullItem> {
    const result: Array<RedactedItem | FullItem> = []
    for (const row of rows) {
        if (row.visibilityTier === "private") continue
        const tier = row.visibilityTier as Exclude<
            SupportVisibilityTier,
            "private"
        >
        const visibility = resolveContentVisibility(tier, opts)
        if (visibility === "locked") continue
        if (visibility === "redacted") {
            result.push(redactedRow(row))
            continue
        }
        result.push(fullRow(row))
    }
    return result
}

// spec 0005 AC-14: a published post with no claim or update activity for
// 30 days is surfaced to moderators for review; never auto-closed
const STALE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

export const listStaleSupportPostsQueryOptions = () =>
    queryOptions({
        queryKey: ["support-posts-stale"],
        queryFn: () => listStaleSupportPosts(),
    })

export const listStaleSupportPosts = createServerFn({ method: "GET" })
    .middleware([ModeratorMiddleware])
    .handler(async ({ context: { userLinkId } }) => {
        await assertReadRateLimit(userLinkId)
        const cutoff = new Date(Date.now() - STALE_WINDOW_MS)

        const recentClaim = db
            .select({ id: supportClaim.id })
            .from(supportClaim)
            .where(
                and(
                    eq(supportClaim.supportPostId, supportPost.id),
                    gte(supportClaim.createdAt, cutoff)
                )
            )
        const recentUpdate = db
            .select({ id: supportUpdate.id })
            .from(supportUpdate)
            .where(
                and(
                    eq(supportUpdate.supportPostId, supportPost.id),
                    gte(supportUpdate.createdAt, cutoff)
                )
            )

        const rows = await db
            .select()
            .from(supportPost)
            .where(
                and(
                    eq(supportPost.status, "published"),
                    lt(supportPost.updatedAt, cutoff),
                    notExists(recentClaim),
                    notExists(recentUpdate)
                )
            )
            .orderBy(asc(supportPost.updatedAt))

        return rows.map((row) => ({
            ...row,
            structuredDetails: JSON.parse(row.structuredDetails),
        }))
    })

// spec-of-record: the header inbox badge's count, unread only: pending
// posts this moderator has not opened yet (an open one has a
// supportPostRead row). A moderator only needs "how many", not the rows
// themselves, so this stays a lightweight count query instead of reusing
// listSupportPosts's full page fetch
export const countPendingSupportPostsQueryOptions = () =>
    queryOptions({
        queryKey: ["support-posts-pending-count"],
        queryFn: () => countPendingSupportPosts(),
    })

export const countPendingSupportPosts = createServerFn({ method: "GET" })
    .middleware([ModeratorMiddleware])
    .handler(async ({ context: { userLinkId } }) => {
        await assertReadRateLimit(userLinkId)
        const readByMe = db
            .select({ id: supportPostRead.supportPostId })
            .from(supportPostRead)
            .where(
                and(
                    eq(supportPostRead.supportPostId, supportPost.id),
                    eq(supportPostRead.moderatorUserLinkId, userLinkId)
                )
            )
        const [{ total }] = await db
            .select({ total: count() })
            .from(supportPost)
            .where(
                and(eq(supportPost.status, "pending"), notExists(readByMe))
            )
        return { count: total }
    })
