import { createServerFn } from "@tanstack/react-start"
import { env } from "cloudflare:workers"
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query"
import { and, desc, eq, inArray, max, sql, type SQL } from "drizzle-orm"
import { db } from "@/db"
import { guide } from "@/schemas/guides"
import { message, trustSignal } from "@/schemas/trust"
import { userLink } from "@/schemas/user-link"
import {
    COMMUNITY_SLUGS,
    isCommunitySlug,
    isHealthCommunity,
    type CommunitySlug,
    type ThreadType,
} from "@/data/communities"
import { SessionMiddleware } from "@/middleware/require-session"
import { ModeratorMiddleware } from "@/middleware/require-moderator"
import { assertNotDecoy, readPrivate } from "@/lib/private-data"
import { assertReadRateLimit, assertWriteRateLimit } from "@/lib/rate-limit"
import { isModerator } from "@/lib/moderators"
import { isEstablishedMember } from "@/lib/community-members"
import { parseIdList } from "@/lib/id-list"
import { decodeCreatedAtCursor, encodeCreatedAtCursor } from "@/lib/cursor"
import { analyzeBodyContent } from "../content-safety"
import {
    getThreadSchema,
    listThreadsSchema,
    setCommunityJoinedSchema,
    submitThreadSchema,
} from "../types"
import { DEFAULT_LIMIT, contributorFor } from "./shared"

const HOME_THREADS = 5
const PENDING_THREADS_CAP = 100

export type ThreadListItem = {
    id: string
    slug: CommunitySlug
    title: string
    excerpt: string
    threadType: ThreadType
    // null for an anonymous thread, from every read (spec 0010 AC-6)
    contributor: string | null
    replyCount: number
    lastActivityAt: Date
}

// the communities a person joined. A decoy session never reads the real
// list (spec 0001 AC-6): which communities someone joined is exactly what a
// coerced unlock must not reveal
async function joinedOf(session: {
    userLinkId: string
    isDecoy: boolean
}): Promise<CommunitySlug[]> {
    return readPrivate(
        session,
        async () => {
            const [row] = await db
                .select({ joinedCommunities: userLink.joinedCommunities })
                .from(userLink)
                .where(eq(userLink.id, session.userLinkId))
            return parseIdList(row?.joinedCommunities).filter(isCommunitySlug)
        },
        []
    )
}

// spec 0010 AC-16: threads by people the reader blocked never appear in a
// list. Done in SQL against the reader's own row, so paging stays correct
// and a long block list never runs into D1's bound parameter cap
function notBlockedBy(userLinkId: string): SQL {
    return sql`${guide.submittedBy} NOT IN (SELECT value FROM json_each(coalesce((SELECT "blockedUserIds" FROM "userLink" AS "reader" WHERE "reader"."id" = ${userLinkId}), '[]')))`
}

// the one list query behind a community's threads and the home feed:
// published threads, newest activity first, ties by id (spec 0010 AC-3)
async function queryThreadList(
    conditions: SQL[],
    limit: number
): Promise<ThreadListItem[]> {
    const rows = await db
        .select({
            id: guide.id,
            category: guide.category,
            title: guide.title,
            excerpt: guide.excerpt,
            threadType: guide.threadType,
            authorVisibility: guide.authorVisibility,
            lastActivityAt: guide.lastActivityAt,
            createdAt: guide.createdAt,
            displayName: userLink.displayName,
            deletedAt: userLink.deletedAt,
            replyCount: sql<number>`(SELECT count(*) FROM ${message} WHERE ${message.kind} = 'comment' AND ${message.contentType} = 'guide' AND ${message.contentId} = ${guide.id} AND ${message.status} = 'visible')`,
        })
        .from(guide)
        .leftJoin(userLink, eq(userLink.id, guide.submittedBy))
        .where(
            and(
                eq(guide.kind, "thread"),
                eq(guide.status, "published"),
                ...conditions
            )
        )
        .orderBy(desc(guide.lastActivityAt), desc(guide.id))
        .limit(limit)

    return rows.map((row) => ({
        id: row.id,
        slug: row.category as CommunitySlug,
        title: row.title,
        excerpt: row.excerpt,
        threadType: row.threadType as ThreadType,
        contributor: contributorFor(row.authorVisibility, {
            displayName: row.displayName,
            deletedAt: row.deletedAt,
        }),
        replyCount: Number(row.replyCount),
        // a published thread always has one; createdAt only guards rows
        // that predate the column
        lastActivityAt: row.lastActivityAt ?? row.createdAt,
    }))
}

// spec 0010 AC-1: every community in the fixed order, joined ones first,
// with the time of its latest published thread activity and how many
// people are in its live room right now
export const listCommunities = createServerFn({ method: "GET" })
    .middleware([SessionMiddleware])
    .handler(async ({ context }) => {
        await assertReadRateLimit(context.userLinkId)
        const joined = new Set(await joinedOf(context))

        const activity = await db
            .select({
                slug: guide.category,
                lastActivityAt: max(guide.lastActivityAt),
            })
            .from(guide)
            .where(and(eq(guide.kind, "thread"), eq(guide.status, "published")))
            .groupBy(guide.category)
        const lastBySlug = new Map(
            activity.map((row) => [row.slug, row.lastActivityAt])
        )
        // one call for every community, each count at most a minute or
        // two old (spec 0010 Value sourcing)
        const hub = env.LIVE_HUB.get(env.LIVE_HUB.idFromName("global"))
        const liveCounts = await hub.liveCounts()

        const all = COMMUNITY_SLUGS.map((slug) => ({
            slug,
            joined: joined.has(slug),
            lastActivityAt: lastBySlug.get(slug) ?? null,
            liveCount: liveCounts[slug] ?? 0,
        }))
        return [
            ...all.filter((community) => community.joined),
            ...all.filter((community) => !community.joined),
        ]
    })

export const listCommunitiesQueryOptions = () =>
    queryOptions({
        queryKey: ["communities"],
        queryFn: () => listCommunities(),
    })

// spec 0010 AC-2: joining only changes what feeds show, never what a
// person may read or post
export const setCommunityJoined = createServerFn({ method: "POST" })
    .middleware([SessionMiddleware])
    .validator(setCommunityJoinedSchema)
    .handler(async ({ data, context }) => {
        const { userLinkId } = context
        assertNotDecoy(context)
        await assertWriteRateLimit(userLinkId)
        if (!isCommunitySlug(data.slug)) {
            throw new Response("Unknown community", { status: 422 })
        }

        const current = new Set(await joinedOf(context))
        if (data.joined) current.add(data.slug)
        else current.delete(data.slug)
        // stored in the fixed order, so the list reads the same everywhere
        const next = COMMUNITY_SLUGS.filter((slug) => current.has(slug))

        await db
            .update(userLink)
            .set({ joinedCommunities: JSON.stringify(next) })
            .where(eq(userLink.id, userLinkId))
        return { joined: next }
    })

// spec 0010 AC-3: one community's published threads, optionally one type,
// paged by (lastActivityAt, id)
export const listThreads = createServerFn({ method: "GET" })
    .middleware([SessionMiddleware])
    .validator(listThreadsSchema)
    .handler(async ({ data, context }) => {
        await assertReadRateLimit(context.userLinkId)
        if (!isCommunitySlug(data.slug)) {
            throw new Response("Not found", { status: 404 })
        }

        const conditions: SQL[] = [
            eq(guide.category, data.slug),
            notBlockedBy(context.userLinkId),
        ]
        if (data.threadType) {
            conditions.push(eq(guide.threadType, data.threadType))
        }
        // the shared cursor codec carries lastActivityAt in its createdAt slot
        const cursor = data.cursor ? decodeCreatedAtCursor(data.cursor) : null
        if (cursor) {
            conditions.push(
                sql`(${guide.lastActivityAt}, ${guide.id}) < (${cursor.createdAt}, ${cursor.id})`
            )
        }

        const rows = await queryThreadList(conditions, DEFAULT_LIMIT + 1)
        const hasMore = rows.length > DEFAULT_LIMIT
        const items = hasMore ? rows.slice(0, DEFAULT_LIMIT) : rows
        const last = items.at(-1)
        return {
            items,
            nextCursor:
                hasMore && last
                    ? encodeCreatedAtCursor({
                          createdAt: last.lastActivityAt,
                          id: last.id,
                      })
                    : null,
        }
    })

export const listThreadsQueryOptions = (
    slug: string,
    threadType?: ThreadType
) =>
    infiniteQueryOptions({
        queryKey: ["threads", slug, threadType ?? null],
        queryFn: ({ pageParam }) =>
            listThreads({
                data: { slug, threadType, cursor: pageParam ?? undefined },
            }),
        initialPageParam: null as string | null,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
    })

// spec 0010 AC-9: the most recently active threads from the communities
// the person joined, or from every community when they joined none
export const listHomeThreads = createServerFn({ method: "GET" })
    .middleware([SessionMiddleware])
    .handler(async ({ context }) => {
        await assertReadRateLimit(context.userLinkId)
        const joined = await joinedOf(context)
        const conditions: SQL[] = [notBlockedBy(context.userLinkId)]
        if (joined.length) conditions.push(inArray(guide.category, joined))

        return {
            fromJoined: joined.length > 0,
            threads: await queryThreadList(conditions, HOME_THREADS),
        }
    })

export const listHomeThreadsQueryOptions = () =>
    queryOptions({
        queryKey: ["threads", "home"],
        queryFn: () => listHomeThreads(),
    })

// spec 0010 AC-6, AC-7: a signed in read of one thread. A pending or
// rejected thread is visible only to moderators, who review it
export const getThread = createServerFn({ method: "GET" })
    .middleware([SessionMiddleware])
    .validator(getThreadSchema)
    .handler(async ({ data, context }) => {
        await assertReadRateLimit(context.userLinkId)

        const [row] = await db
            .select({
                id: guide.id,
                kind: guide.kind,
                category: guide.category,
                title: guide.title,
                excerpt: guide.excerpt,
                threadType: guide.threadType,
                authorVisibility: guide.authorVisibility,
                bodyContent: guide.bodyContent,
                status: guide.status,
                createdAt: guide.createdAt,
                lastActivityAt: guide.lastActivityAt,
                displayName: userLink.displayName,
                deletedAt: userLink.deletedAt,
            })
            .from(guide)
            .leftJoin(userLink, eq(userLink.id, guide.submittedBy))
            .where(eq(guide.id, data.id))
        if (!row || row.kind !== "thread") {
            throw new Response("Not found", { status: 404 })
        }
        if (
            row.status !== "published" &&
            !(await isModerator(context.userLinkId))
        ) {
            throw new Response("Not found", { status: 404 })
        }

        return {
            id: row.id,
            slug: row.category as CommunitySlug,
            title: row.title,
            excerpt: row.excerpt,
            threadType: row.threadType as ThreadType,
            bodyContent: row.bodyContent,
            status: row.status,
            createdAt: row.createdAt,
            lastActivityAt: row.lastActivityAt ?? row.createdAt,
            contributor: contributorFor(row.authorVisibility, {
                displayName: row.displayName,
                deletedAt: row.deletedAt,
            }),
            isHealth: isHealthCommunity(row.category),
        }
    })

export const getThreadQueryOptions = (id: string) =>
    queryOptions({
        queryKey: ["thread", id],
        // a 404 Response can't be dehydrated into the SSR stream, so not
        // found resolves to null, the same as getGuideQueryOptions
        queryFn: async () => {
            try {
                return await getThread({ data: { id } })
            } catch (error) {
                if (error instanceof Response) return null
                throw error
            }
        },
    })

// spec 0010 AC-4, AC-5: the same editor, checks and limits as a story.
// Publishes at once for an established member, otherwise waits for a
// moderator in the inbox
export const submitThread = createServerFn({ method: "POST" })
    .middleware([SessionMiddleware])
    .validator(submitThreadSchema)
    .handler(async ({ data, context }) => {
        const { userLinkId } = context
        assertNotDecoy(context)
        await assertWriteRateLimit(userLinkId)
        if (!isCommunitySlug(data.slug)) {
            throw new Response("Unknown community", { status: 422 })
        }

        const { wordCount, hasLink } = analyzeBodyContent(data.bodyContent)
        const status = (await isEstablishedMember(userLinkId))
            ? ("published" as const)
            : ("pending" as const)
        const now = new Date()

        // thread and its trust_signal land together, as with a guide or
        // a story (spec 0004 AC-3)
        await db.batch([
            db.insert(guide).values({
                id: data.id,
                title: data.title,
                excerpt: data.excerpt,
                category: data.slug,
                kind: "thread",
                authorVisibility: data.authorVisibility,
                threadType: data.threadType,
                bodyContent: JSON.stringify(data.bodyContent),
                wordCount,
                status,
                lastActivityAt: status === "published" ? now : null,
                submittedBy: userLinkId,
                createdAt: now,
                updatedAt: now,
            }),
            db.insert(trustSignal).values({
                id: crypto.randomUUID(),
                contentType: "guide",
                contentId: data.id,
                submittedAt: now,
                submittedBy: userLinkId,
                referencesAvailable: hasLink,
            }),
        ])

        return { id: data.id, slug: data.slug, status }
    })

// the moderator inbox's thread tab (spec 0010 AC-5): pending threads,
// oldest first so nothing waits forever. Author names stay hidden for
// anonymous threads here too
export const listPendingThreads = createServerFn({ method: "GET" })
    .middleware([ModeratorMiddleware])
    .handler(async () => {
        const rows = await db
            .select({
                id: guide.id,
                category: guide.category,
                title: guide.title,
                excerpt: guide.excerpt,
                threadType: guide.threadType,
                authorVisibility: guide.authorVisibility,
                bodyContent: guide.bodyContent,
                createdAt: guide.createdAt,
                displayName: userLink.displayName,
                deletedAt: userLink.deletedAt,
            })
            .from(guide)
            .leftJoin(userLink, eq(userLink.id, guide.submittedBy))
            .where(and(eq(guide.kind, "thread"), eq(guide.status, "pending")))
            .orderBy(guide.createdAt)
            .limit(PENDING_THREADS_CAP)

        return rows.map(({ displayName, deletedAt, authorVisibility, category, ...row }) => ({
            ...row,
            slug: category as CommunitySlug,
            threadType: row.threadType as ThreadType,
            contributor: contributorFor(authorVisibility, {
                displayName,
                deletedAt,
            }),
        }))
    })

export const listPendingThreadsQueryOptions = () =>
    queryOptions({
        queryKey: ["threads", "pending"],
        queryFn: () => listPendingThreads(),
    })
