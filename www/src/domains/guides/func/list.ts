import { createServerFn } from "@tanstack/react-start"
import { queryOptions } from "@tanstack/react-query"
import { and, desc, eq, or, sql } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/db"
import { guide, guideSeries } from "@/schemas/guides"
import { trustSignal } from "@/schemas/trust"
import { userLink } from "@/schemas/user-link"
import { assertReadRateLimit } from "@/lib/rate-limit"
import { encodeCreatedAtCursor, decodeCreatedAtCursor } from "@/lib/cursor"
import { computeReadTime } from "../content-safety"
import {
    assertValidCategoryForKind,
    listGuidesSchema,
    type GuideStatus,
} from "../types"
import { DEFAULT_LIMIT, MAX_LIMIT, contributorFor, currentModeratorId, getClientKey } from "./shared"

export type ListGuidesFilters = z.infer<typeof listGuidesSchema>

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

        const kind = data.kind ?? "guide"
        if (data.category) {
            assertValidCategoryForKind(kind, data.category)
        }

        const limit = Math.min(data.limit ?? DEFAULT_LIMIT, MAX_LIMIT)

        const conditions = [
            eq(guide.status, effectiveStatus),
            eq(guide.kind, kind),
        ]
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
                kind: guide.kind,
                authorVisibility: guide.authorVisibility,
                status: guide.status,
                wordCount: guide.wordCount,
                createdAt: guide.createdAt,
                coverImageUrl: guide.coverImageUrl,
                seriesTitle: guideSeries.title,
                seriesOrder: guide.seriesOrder,
                displayName: userLink.displayName,
                profileDeletedAt: userLink.deletedAt,
                communityReviewed: trustSignal.communityReviewed,
                coSignCount: trustSignal.coSignCount,
                professionalVerified: trustSignal.professionalVerified,
            })
            .from(guide)
            .leftJoin(userLink, eq(userLink.id, guide.submittedBy))
            .leftJoin(guideSeries, eq(guideSeries.id, guide.seriesId))
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
                contributor: contributorFor(row.authorVisibility, {
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

export const listGuidesQueryOptions = (filters: ListGuidesFilters = {}) =>
    queryOptions({
        queryKey: ["guides", filters],
        queryFn: () => listGuides({ data: filters }),
    })
