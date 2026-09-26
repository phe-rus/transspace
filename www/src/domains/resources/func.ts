import { createServerFn } from "@tanstack/react-start"
import { getRequestHeaders } from "@tanstack/react-start/server"
import { queryOptions } from "@tanstack/react-query"
import { and, desc, eq, or, sql } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/db"
import { country, resource } from "@/schemas/resources"
import { trustSignal } from "@/schemas/trust"
import { SessionMiddleware } from "@/middleware/require-session"
import { ModeratorMiddleware } from "@/middleware/require-moderator"
import { getCurrentSession } from "@/middleware/session"
import { isModerator } from "@/lib/moderators"
import { assertNotDecoy } from "@/lib/private-data"
import { logModerationAction } from "@/lib/moderation-audit"
import { assertWriteRateLimit, assertReadRateLimit } from "@/lib/rate-limit"
import { readTrustSignal } from "@/domains/trust-signals"
import { encodeCreatedAtCursor, decodeCreatedAtCursor } from "@/lib/cursor"
import {
    assertValidCategory,
    getResourceSchema,
    listResourcesSchema,
    publishResourceSchema,
    rejectResourceSchema,
    submitResourceSchema,
    type ResourceStatus,
} from "./types"

export type ListResourcesFilters = z.infer<typeof listResourcesSchema>

export const listResourcesQueryOptions = (
    filters: ListResourcesFilters = {}
) =>
    queryOptions({
        queryKey: ["resources", filters],
        queryFn: () => listResources({ data: filters }),
    })

export const getResourceQueryOptions = (id: string) =>
    queryOptions({
        queryKey: ["resource", id],
        // getResource throws a 404 Response (matches the REST route's
        // contract, spec 0003-resource-directory AC-2), but a Response
        // can't be serialized into the SSR stream's dehydrated query
        // cache; resolving to null here keeps the not-found case a
        // normal successful query result instead of a query error
        queryFn: async () => {
            try {
                return await getResource({ data: { id } })
            } catch (error) {
                if (error instanceof Response) return null
                throw error
            }
        },
    })

export const listCountriesQueryOptions = () =>
    queryOptions({
        queryKey: ["countries"],
        queryFn: () => listCountries(),
    })

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50

function getClientKey(): string {
    return getRequestHeaders().get("cf-connecting-ip") ?? "anonymous"
}

// found-or-created against country.name via a case-insensitive lookup;
// insert-if-absent then select, not a plain check-then-insert, so two
// simultaneous first submissions for the same new country never both
// fail or double-insert (spec 0003 Value sourcing)
async function findOrCreateCountry(name: string): Promise<string> {
    const trimmed = name.trim()
    const existing = await db
        .select({ id: country.id })
        .from(country)
        .where(sql`lower(${country.name}) = lower(${trimmed})`)
    if (existing[0]) return existing[0].id

    await db
        .insert(country)
        .values({
            id: crypto.randomUUID(),
            name: trimmed,
            createdAt: new Date(),
        })
        .onConflictDoNothing()

    const row = await db
        .select({ id: country.id })
        .from(country)
        .where(sql`lower(${country.name}) = lower(${trimmed})`)
    // always present here: either our own insert landed, or a
    // concurrent insert for the same name landed first and this select
    // finds theirs (spec 0003 Critical test scenarios, Concurrency)
    return row[0]!.id
}

// GET /resources and GET /resources/:id both need "is this caller a
// moderator, if they even have a session" without ever requiring one
// (spec 0003 API surface): no middleware, read the session directly
async function currentModeratorId(): Promise<string | null> {
    const session = await getCurrentSession()
    if (!session) return null
    return (await isModerator(session.userLinkId))
        ? session.userLinkId
        : null
}

// backs the manual location picker's country list (spec 0003 AC-6): only
// countries that actually have a published resource, so picking one is
// never a dead end
export const listCountries = createServerFn({ method: "GET" }).handler(
    async () => {
        await assertReadRateLimit(getClientKey())
        return db
            .selectDistinct({ id: country.id, name: country.name })
            .from(country)
            .innerJoin(resource, eq(resource.countryId, country.id))
            .where(eq(resource.status, "published"))
            .orderBy(country.name)
    }
)

export const listResources = createServerFn({ method: "GET" })
    .validator(listResourcesSchema)
    .handler(async ({ data }) => {
        await assertReadRateLimit(getClientKey())

        let effectiveStatus: ResourceStatus = "published"
        if (data.status && data.status !== "published") {
            if (!(await currentModeratorId())) {
                throw new Response("Forbidden", { status: 403 })
            }
            effectiveStatus = data.status
        }

        if (data.category) {
            assertValidCategory(data.category, data.subcategory)
        }

        const limit = Math.min(data.limit ?? DEFAULT_LIMIT, MAX_LIMIT)

        const conditions = [eq(resource.status, effectiveStatus)]
        if (data.category)
            conditions.push(eq(resource.category, data.category))
        if (data.subcategory)
            conditions.push(eq(resource.subcategory, data.subcategory))
        if (data.countryId)
            conditions.push(eq(resource.countryId, data.countryId))
        if (data.country)
            conditions.push(
                sql`lower(${country.name}) = lower(${data.country})`
            )
        if (data.city)
            conditions.push(
                sql`lower(${resource.city}) = lower(${data.city})`
            )
        if (data.tier) conditions.push(eq(resource.tier, data.tier))
        if (data.freeOnly) conditions.push(eq(resource.isFree, true))
        if (data.internationalOnly)
            conditions.push(eq(resource.internationalAccess, true))
        if (data.verifiedOnly)
            conditions.push(eq(trustSignal.professionalVerified, true))
        if (data.search) {
            const q = `%${data.search.trim().toLowerCase()}%`
            conditions.push(
                or(
                    sql`lower(${resource.name}) LIKE ${q}`,
                    sql`lower(${resource.description}) LIKE ${q}`,
                    sql`lower(${resource.city}) LIKE ${q}`,
                    sql`lower(${country.name}) LIKE ${q}`
                )!
            )
        }
        const cursor = data.cursor ? decodeCreatedAtCursor(data.cursor) : null
        if (cursor) {
            conditions.push(
                sql`(${resource.createdAt}, ${resource.id}) < (${cursor.createdAt}, ${cursor.id})`
            )
        }

        const rows = await db
            .select({
                id: resource.id,
                name: resource.name,
                category: resource.category,
                subcategory: resource.subcategory,
                countryId: resource.countryId,
                countryName: country.name,
                city: resource.city,
                lat: resource.lat,
                lng: resource.lng,
                description: resource.description,
                estimate: resource.estimate,
                isFree: resource.isFree,
                contact: resource.contact,
                internationalAccess: resource.internationalAccess,
                tier: resource.tier,
                structuredDetails: resource.structuredDetails,
                status: resource.status,
                createdAt: resource.createdAt,
                professionalVerified: trustSignal.professionalVerified,
                communityReviewed: trustSignal.communityReviewed,
                coSignCount: trustSignal.coSignCount,
                lastReviewedAt: trustSignal.lastReviewedAt,
            })
            .from(resource)
            .innerJoin(country, eq(resource.countryId, country.id))
            .leftJoin(
                trustSignal,
                and(
                    eq(trustSignal.contentType, "resource"),
                    eq(trustSignal.contentId, resource.id)
                )
            )
            .where(and(...conditions))
            .orderBy(desc(resource.createdAt), desc(resource.id))
            .limit(limit + 1)

        const hasMore = rows.length > limit
        const items = hasMore ? rows.slice(0, limit) : rows
        const last = items.at(-1)
        return {
            items,
            nextCursor: hasMore && last ? encodeCreatedAtCursor(last) : null,
        }
    })

export const getResource = createServerFn({ method: "GET" })
    .validator(getResourceSchema)
    .handler(async ({ data }) => {
        await assertReadRateLimit(getClientKey())

        const rows = await db
            .select({
                id: resource.id,
                name: resource.name,
                category: resource.category,
                subcategory: resource.subcategory,
                countryId: resource.countryId,
                countryName: country.name,
                city: resource.city,
                lat: resource.lat,
                lng: resource.lng,
                description: resource.description,
                estimate: resource.estimate,
                isFree: resource.isFree,
                contact: resource.contact,
                internationalAccess: resource.internationalAccess,
                tier: resource.tier,
                structuredDetails: resource.structuredDetails,
                status: resource.status,
                createdAt: resource.createdAt,
            })
            .from(resource)
            .innerJoin(country, eq(resource.countryId, country.id))
            .where(eq(resource.id, data.id))
        const row = rows[0]
        if (!row) {
            throw new Response("Not found", { status: 404 })
        }
        if (row.status !== "published") {
            if (!(await currentModeratorId())) {
                throw new Response("Not found", { status: 404 })
            }
        }

        const trust = await readTrustSignal("resource", row.id)
        return { ...row, trust }
    })

export const submitResource = createServerFn({ method: "POST" })
    .middleware([SessionMiddleware])
    .validator(submitResourceSchema)
    .handler(async ({ data, context }) => {
        const { userLinkId } = context
        assertNotDecoy(context)
        await assertWriteRateLimit(userLinkId)
        assertValidCategory(data.category, data.subcategory)
        // a submitter can only declare diy, and only a health entry carries
        // a tier at all (spec 0006 AC-1, AC-4)
        if (data.tier === "verified") {
            throw new Response("Only a moderator can set verified", {
                status: 422,
            })
        }
        const tier =
            data.category === "health" && data.tier === "diy" ? "diy" : null

        const countryId = await findOrCreateCountry(data.countryName)
        const id = crypto.randomUUID()
        const now = new Date()

        // resource + its trust_signal are created together: either both
        // land or neither does (spec 0003 AC-3, Key invariants). Inserts
        // the trust_signal row inline rather than calling the shared
        // createTrustSignal (it's already-awaited, not usable inside a
        // batch of un-executed query builders); the row shape matches
        // createTrustSignal's own insert exactly.
        await db.batch([
            db.insert(resource).values({
                id,
                name: data.name,
                category: data.category,
                subcategory: data.subcategory ?? null,
                countryId,
                city: data.city,
                lat: data.lat ?? null,
                lng: data.lng ?? null,
                description: data.description,
                estimate: data.estimate ?? null,
                isFree: data.isFree ?? false,
                contact: data.contact ?? null,
                internationalAccess: data.internationalAccess ?? false,
                tier,
                structuredDetails: data.structuredDetails
                    ? JSON.stringify(data.structuredDetails)
                    : null,
                status: "pending",
                submittedBy: userLinkId,
                createdAt: now,
                updatedAt: now,
            }),
            db.insert(trustSignal).values({
                id: crypto.randomUUID(),
                contentType: "resource",
                contentId: id,
                submittedAt: now,
                submittedBy: userLinkId,
            }),
        ])

        return { id, status: "pending" as const }
    })

export const publishResource = createServerFn({ method: "POST" })
    .middleware([ModeratorMiddleware])
    .validator(publishResourceSchema)
    .handler(async ({ data, context }) => {
        const { userLinkId } = context
        assertNotDecoy(context)
        await assertWriteRateLimit(userLinkId)

        const [row] = await db
            .select({ status: resource.status, category: resource.category })
            .from(resource)
            .where(eq(resource.id, data.id))
        if (!row) {
            throw new Response("Not found", { status: 404 })
        }
        if (row.status !== "pending") {
            throw new Response("Not pending", { status: 422 })
        }

        // the moderator confirms or changes the tier here (spec 0006
        // AC-5); a tier on a non health entry is dropped (AC-1)
        await db
            .update(resource)
            .set({
                status: "published",
                updatedAt: new Date(),
                ...(data.tier !== undefined
                    ? { tier: row.category === "health" ? data.tier : null }
                    : {}),
            })
            .where(eq(resource.id, data.id))

        await logModerationAction({
            actorUserLinkId: userLinkId,
            action: "resource.publish",
            target: data.id,
        })

        return { id: data.id, status: "published" as const }
    })

export const rejectResource = createServerFn({ method: "POST" })
    .middleware([ModeratorMiddleware])
    .validator(rejectResourceSchema)
    .handler(async ({ data, context }) => {
        const { userLinkId } = context
        assertNotDecoy(context)
        await assertWriteRateLimit(userLinkId)

        const [row] = await db
            .select({ status: resource.status })
            .from(resource)
            .where(eq(resource.id, data.id))
        if (!row) {
            throw new Response("Not found", { status: 404 })
        }
        // reachable from pending (screening) or published (a takedown
        // of something already live), never from rejected again (spec
        // 0003 State transitions)
        if (row.status === "rejected") {
            throw new Response("Already rejected", { status: 422 })
        }

        await db
            .update(resource)
            .set({ status: "rejected", updatedAt: new Date() })
            .where(eq(resource.id, data.id))

        await logModerationAction({
            actorUserLinkId: userLinkId,
            action: "resource.reject",
            target: data.id,
        })

        return { id: data.id, status: "rejected" as const }
    })
