import { createServerFn } from "@tanstack/react-start"
import { queryOptions } from "@tanstack/react-query"
import { count, eq } from "drizzle-orm"
import { db } from "@/db"
import { moderators } from "@/schemas/moderation"
import { profile } from "@/schemas/profile"
import { ModeratorMiddleware } from "@/middleware/require-moderator"
import { AdminMiddleware } from "@/middleware/require-admin"
import { getCurrentSession } from "@/middleware/session"
import { isModerator } from "@/lib/moderators"
import { logModerationAction } from "@/lib/moderation-audit"
import { paginationSchema, toPage } from "@/lib/pagination"
import { assertWriteRateLimit, assertReadRateLimit } from "@/lib/rate-limit"
import { assertTurnstileVerified } from "@/lib/turnstile"
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
                .select({ countryCode: moderators.countryCode })
                .from(moderators)
                .where(eq(moderators.userLinkId, session.userLinkId)),
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
                userLinkId: moderators.userLinkId,
                grantedBy: moderators.grantedBy,
                grantedAt: moderators.grantedAt,
                countryCode: moderators.countryCode,
                displayName: profile.displayName,
            })
            .from(moderators)
            .leftJoin(profile, eq(profile.userLinkId, moderators.userLinkId))
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
        await assertTurnstileVerified(data.turnstileToken)
        if (data.targetUserLinkId === userLinkId) {
            throw new Response(
                "Cannot grant moderator status to yourself",
                { status: 422 }
            )
        }
        await db.insert(moderators).values({
            userLinkId: data.targetUserLinkId,
            grantedBy: userLinkId,
            grantedAt: new Date(),
            countryCode: data.countryCode ?? null,
        })
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
        await assertTurnstileVerified(data.turnstileToken)
        const [target] = await db
            .select({ userLinkId: moderators.userLinkId })
            .from(moderators)
            .where(eq(moderators.userLinkId, data.userLinkId))
        if (!target) {
            throw new Response("Not a moderator", { status: 404 })
        }
        await db
            .update(moderators)
            .set({ countryCode: data.countryCode ?? null })
            .where(eq(moderators.userLinkId, data.userLinkId))
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
        await assertTurnstileVerified(data.turnstileToken)
        const [target] = await db
            .select({ userLinkId: moderators.userLinkId })
            .from(moderators)
            .where(eq(moderators.userLinkId, data.userLinkId))
        if (!target) {
            throw new Response("Not a moderator", {
                status: 404,
            })
        }
        const [{ total }] = await db
            .select({ total: count() })
            .from(moderators)
        // rejected outright, no override endpoint (spec 0002 key invariants)
        if (total - 1 < MODERATOR_FLOOR) {
            throw new Response(
                "Revoking this moderator would drop the count below the floor of two",
                { status: 409 }
            )
        }
        await db
            .delete(moderators)
            .where(eq(moderators.userLinkId, data.userLinkId))
        await logModerationAction({
            actorUserLinkId: userLinkId,
            action: "moderator.revoke",
            target: data.userLinkId,
        })
        return { success: true as const }
    })
