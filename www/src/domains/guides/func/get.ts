import { createServerFn } from "@tanstack/react-start"
import { queryOptions } from "@tanstack/react-query"
import { and, asc, eq, inArray, ne } from "drizzle-orm"
import { db } from "@/db"
import { guide, guideSeries } from "@/schemas/guides"
import { resource } from "@/schemas/resources"
import { trustSignal } from "@/schemas/trust"
import { userLink } from "@/schemas/user-link"
import { assertReadRateLimit } from "@/lib/rate-limit"
import { computeReadTime } from "../content-safety"
import { getGuideSchema } from "../types"
import { contributorFor, currentModeratorId, getClientKey } from "./shared"

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
                kind: guide.kind,
                authorVisibility: guide.authorVisibility,
                bodyContent: guide.bodyContent,
                relatedResourceIds: guide.relatedResourceIds,
                coverImageUrl: guide.coverImageUrl,
                videoUrl: guide.videoUrl,
                seriesId: guide.seriesId,
                seriesOrder: guide.seriesOrder,
                seriesTitle: guideSeries.title,
                status: guide.status,
                wordCount: guide.wordCount,
                createdAt: guide.createdAt,
                displayName: userLink.displayName,
                profileDeletedAt: userLink.deletedAt,
            })
            .from(guide)
            .leftJoin(userLink, eq(userLink.id, guide.submittedBy))
            .leftJoin(guideSeries, eq(guideSeries.id, guide.seriesId))
            .where(eq(guide.id, data.id))
        const row = rows[0]
        // a community thread is signed in only and read through getThread;
        // this public read never returns one (spec 0010 AC-19)
        if (!row || row.kind === "thread") {
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

        // spec 0004 AC-10: sibling guides in the same series, ordered
        // for a prev/next-style reading path; published only, never
        // this guide itself
        const seriesGuides = row.seriesId
            ? await db
                  .select({
                      id: guide.id,
                      title: guide.title,
                      seriesOrder: guide.seriesOrder,
                  })
                  .from(guide)
                  .where(
                      and(
                          eq(guide.seriesId, row.seriesId),
                          eq(guide.status, "published"),
                          ne(guide.id, row.id)
                      )
                  )
                  .orderBy(asc(guide.seriesOrder))
            : []

        const { displayName, profileDeletedAt, wordCount, ...rest } = row
        return {
            ...rest,
            contributor: contributorFor(row.authorVisibility, {
                displayName,
                deletedAt: profileDeletedAt,
            }),
            readTime: computeReadTime(wordCount),
            relatedResources,
            seriesGuides,
            trust: {
                communityReviewed,
                coSignCount,
                referencesAvailable,
            },
        }
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
