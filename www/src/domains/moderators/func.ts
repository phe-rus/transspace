import { createServerFn } from "@tanstack/react-start"
import { queryOptions } from "@tanstack/react-query"
import { count, eq, isNotNull } from "drizzle-orm"
import { db } from "@/db"
import { userLink } from "@/schemas/user-link"
import { ModeratorMiddleware } from "@/middleware/require-moderator"
import { AdminMiddleware } from "@/middleware/require-admin"
import { getCurrentSession } from "@/middleware/session"
import { isModerator } from "@/lib/moderators"
import { logModerationAction } from "@/lib/moderation-audit"
import { paginationSchema, toPage } from "@/lib/pagination"
import { assertWriteRateLimit, assertReadRateLimit } from "@/lib/rate-limit"
import { assertNotDecoy } from "@/lib/private-data"
import {
    grantModeratorSchema,
    MODERATOR_FLOOR,
    revokeModeratorSchema,
    setModeratorCountrySchema,
} from "./types"

// a route guard for a moderator-only page (spec 0005's mutual aid queue
// is the first one) needs to ask "is the current caller a moderator at
// all", not gate on ModeratorMiddleware's 403; no session is simply
// "no", never an error
export const amIModerator = createServerFn({ method: "GET" }).handler(
    async () => {
        const session = await getCurrentSession()
        if (!session) {
            return { isModerator: false as const, countryCode: null }
        }
        const [moderator, [row]] = await Promise.all([
            isModerator(session.userLinkId),
            db
                .select({ countryCode: userLink.moderatorCountryCode })
                .from(userLink)
                .where(eq(userLink.id, session.userLinkId)),
        ])
        return { isModerator: moderator, countryCode: row?.countryCode ?? null }
    }
)

export const amIModeratorQueryOptions = () =>
    queryOptions({
        queryKey: ["am-i-moderator"],
        queryFn: () => amIModerator(),
    })

export const listModeratorsQueryOptions = () =>
    queryOptions({
        queryKey: ["moderators"],
        queryFn: () => listModerators({ data: {} }),
    })

export const listModerators = createServerFn({ method: "GET" })
    .middleware([ModeratorMiddleware])
    .validator(paginationSchema)
    .handler(async ({ data, context: { userLinkId } }) => {
        await assertReadRateLimit(userLinkId)
        const rows = await db
            .select({
                userLinkId: userLink.id,
                grantedBy: userLink.moderatorGrantedBy,
                grantedAt: userLink.moderatorGrantedAt,
                countryCode: userLink.moderatorCountryCode,
                displayName: userLink.displayName,
            })
            .from(userLink)
            .where(isNotNull(userLink.moderatorGrantedAt))
            .limit(data.limit + 1)
        return toPage(
            rows.map((row) => ({ ...row, id: row.userLinkId })),
            data.limit
        )
    })

// admin only (any admin, not just the super admin): "other admins can
// manage everything else" was the explicit call, managing moderators
// included, unlike managing the admin roster itself (domains/admins)
export const grantModerator = createServerFn({ method: "POST" })
    .middleware([AdminMiddleware])
    .validator(grantModeratorSchema)
    .handler(async ({ data, context }) => {
        const { userLinkId } = context
        assertNotDecoy(context)
        await assertWriteRateLimit(userLinkId)
        if (data.targetUserLinkId === userLinkId) {
            throw new Response(
                "Cannot grant moderator status to yourself",
                { status: 422 }
            )
        }
        const [target] = await db
            .select({ grantedAt: userLink.moderatorGrantedAt })
            .from(userLink)
            .where(eq(userLink.id, data.targetUserLinkId))
        if (!target) {
            throw new Response("Not found", { status: 404 })
        }
        if (target.grantedAt) {
            throw new Response("Already a moderator", { status: 409 })
        }
        await db
            .update(userLink)
            .set({
                moderatorGrantedAt: new Date(),
                moderatorGrantedBy: userLinkId,
                moderatorCountryCode: data.countryCode ?? null,
            })
            .where(eq(userLink.id, data.targetUserLinkId))
        await logModerationAction({
            actorUserLinkId: userLinkId,
            action: "moderator.grant",
            target: data.targetUserLinkId,
        })
        return { success: true as const }
    })

// admin only: re-scopes an existing moderator's country tag without a
// revoke+re-grant round trip, or clears it back to general (null)
export const setModeratorCountry = createServerFn({ method: "POST" })
    .middleware([AdminMiddleware])
    .validator(setModeratorCountrySchema)
    .handler(async ({ data, context }) => {
        const { userLinkId } = context
        assertNotDecoy(context)
        await assertWriteRateLimit(userLinkId)
        const [target] = await db
            .select({ grantedAt: userLink.moderatorGrantedAt })
            .from(userLink)
            .where(eq(userLink.id, data.userLinkId))
        if (!target?.grantedAt) {
            throw new Response("Not a moderator", { status: 404 })
        }
        await db
            .update(userLink)
            .set({ moderatorCountryCode: data.countryCode ?? null })
            .where(eq(userLink.id, data.userLinkId))
        await logModerationAction({
            actorUserLinkId: userLinkId,
            action: "moderator.setCountry",
            target: data.userLinkId,
        })
        return { success: true as const }
    })

export const revokeModerator = createServerFn({ method: "POST" })
    .middleware([AdminMiddleware])
    .validator(revokeModeratorSchema)
    .handler(async ({ data, context }) => {
        const { userLinkId } = context
        assertNotDecoy(context)
        await assertWriteRateLimit(userLinkId)
        const [target] = await db
            .select({ grantedAt: userLink.moderatorGrantedAt })
            .from(userLink)
            .where(eq(userLink.id, data.userLinkId))
        if (!target?.grantedAt) {
            throw new Response("Not a moderator", {
                status: 404,
            })
        }
        const [{ total }] = await db
            .select({ total: count() })
            .from(userLink)
            .where(isNotNull(userLink.moderatorGrantedAt))
        // rejected outright, no override endpoint (spec 0002 key invariants)
        if (total - 1 < MODERATOR_FLOOR) {
            throw new Response(
                "Revoking this moderator would drop the count below the floor of two",
                { status: 409 }
            )
        }
        await db
            .update(userLink)
            .set({
                moderatorGrantedAt: null,
                moderatorGrantedBy: null,
                moderatorCountryCode: null,
            })
            .where(eq(userLink.id, data.userLinkId))
        await logModerationAction({
            actorUserLinkId: userLinkId,
            action: "moderator.revoke",
            target: data.userLinkId,
        })
        return { success: true as const }
    })
