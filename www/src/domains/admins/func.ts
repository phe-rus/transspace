import { createServerFn } from "@tanstack/react-start"
import { queryOptions } from "@tanstack/react-query"
import { desc, eq } from "drizzle-orm"
import { db } from "@/db"
import { moderationAction } from "@/schemas/moderation"
import { userLink } from "@/schemas/user-link"
import { AdminMiddleware } from "@/middleware/require-admin"
import { FounderMiddleware } from "@/middleware/require-founder"
import { getCurrentSession } from "@/middleware/session"
import { isAdmin, isFounder, isSuperAdmin } from "@/lib/admins"
import { logModerationAction } from "@/lib/moderation-audit"
import { paginationSchema, toPage } from "@/lib/pagination"
import { assertWriteRateLimit, assertReadRateLimit } from "@/lib/rate-limit"
import { assertTurnstileVerified } from "@/lib/turnstile"
import { assertNotDecoy } from "@/lib/private-data"
import {
    banUserSchema,
    demoteSuperAdminSchema,
    grantAdminSchema,
    grantSuperAdminSchema,
    revokeAdminSchema,
    unbanUserSchema,
} from "./types"

// a route guard for the admin area needs "is the current caller an
// admin at all", not gate on AdminMiddleware's 403; no session is
// simply "no", never an error (matches amIModerator's shape)
export const amIAdmin = createServerFn({ method: "GET" }).handler(
    async () => {
        const session = await getCurrentSession()
        if (!session) {
            return {
                isAdmin: false as const,
                isSuperAdmin: false as const,
                isFounder: false as const,
            }
        }
        const [admin, superAdmin, founder] = await Promise.all([
            isAdmin(session.userLinkId),
            isSuperAdmin(session.userLinkId),
            isFounder(session.userLinkId),
        ])
        return { isAdmin: admin, isSuperAdmin: superAdmin, isFounder: founder }
    }
)

export const amIAdminQueryOptions = () =>
    queryOptions({
        queryKey: ["am-i-admin"],
        queryFn: () => amIAdmin(),
    })

export const listAllUsersQueryOptions = () =>
    queryOptions({
        queryKey: ["admin-users"],
        queryFn: () => listAllUsers({ data: {} }),
    })

// spec-of-record: the requested "see all users" admin capability. Joins
// each account's pseudonymous profile plus whether they hold moderator
// or admin status, so the dashboard can show the whole roster at a
// glance without N+1 lookups.
export const listAllUsers = createServerFn({ method: "GET" })
    .middleware([AdminMiddleware])
    .validator(paginationSchema)
    .handler(async ({ data, context: { userLinkId } }) => {
        await assertReadRateLimit(userLinkId)
        const rows = await db
            .select({
                id: userLink.id,
                createdAt: userLink.createdAt,
                deletedAt: userLink.deletedAt,
                bannedAt: userLink.bannedAt,
                banReason: userLink.banReason,
                displayName: userLink.displayName,
                moderatorGrantedAt: userLink.moderatorGrantedAt,
                moderatorCountryCode: userLink.moderatorCountryCode,
                adminRole: userLink.adminRole,
                adminGrantedBy: userLink.adminGrantedBy,
            })
            .from(userLink)
            .orderBy(desc(userLink.createdAt))
            .limit(data.limit + 1)
        return toPage(
            rows.map((row) => ({
                id: row.id,
                createdAt: row.createdAt,
                displayName: row.displayName,
                isBanned: row.bannedAt !== null,
                banReason: row.banReason,
                isModerator: row.moderatorGrantedAt !== null,
                moderatorCountryCode: row.moderatorCountryCode,
                isAdmin: row.adminRole !== null,
                isSuperAdmin: row.adminRole === "super_admin",
                isFounder: row.adminRole === "super_admin" && row.adminGrantedBy === null,
            })),
            data.limit
        )
    })

export const listActivityLogQueryOptions = () =>
    queryOptions({
        queryKey: ["admin-activity"],
        queryFn: () => listActivityLog({ data: {} }),
    })

// spec-of-record: the requested "see all activities" admin capability.
// Reads the same append-only moderationAction log every moderator
// action already writes to (spec 0002 key invariants); nothing new to
// track, just the first read surface for it.
export const listActivityLog = createServerFn({ method: "GET" })
    .middleware([AdminMiddleware])
    .validator(paginationSchema)
    .handler(async ({ data, context: { userLinkId } }) => {
        await assertReadRateLimit(userLinkId)
        const rows = await db
            .select({
                id: moderationAction.id,
                actorUserLinkId: moderationAction.actorUserLinkId,
                actorDisplayName: userLink.displayName,
                action: moderationAction.action,
                target: moderationAction.target,
                createdAt: moderationAction.createdAt,
            })
            .from(moderationAction)
            .leftJoin(
                userLink,
                eq(userLink.id, moderationAction.actorUserLinkId)
            )
            .orderBy(desc(moderationAction.createdAt))
            .limit(data.limit + 1)
        return toPage(rows, data.limit)
    })

// any admin can promote someone to plain 'admin' ("admins have all
// rights... can make someone an admin", the engineer's explicit call,
// 2026-09-25). Never touches an existing super_admin row, see
// demoteSuperAdmin for that.
export const grantAdmin = createServerFn({ method: "POST" })
    .middleware([AdminMiddleware])
    .validator(grantAdminSchema)
    .handler(async ({ data, context }) => {
        const { userLinkId } = context
        assertNotDecoy(context)
        await assertWriteRateLimit(userLinkId)
        await assertTurnstileVerified(data.turnstileToken)
        if (data.targetUserLinkId === userLinkId) {
            throw new Response("Cannot grant admin status to yourself", {
                status: 422,
            })
        }
        const [existing] = await db
            .select({ adminRole: userLink.adminRole })
            .from(userLink)
            .where(eq(userLink.id, data.targetUserLinkId))
        if (!existing) {
            throw new Response("Not found", { status: 404 })
        }
        if (existing.adminRole) {
            throw new Response("Already an admin", { status: 409 })
        }
        await db
            .update(userLink)
            .set({
                adminRole: "admin",
                adminGrantedBy: userLinkId,
                adminGrantedAt: new Date(),
            })
            .where(eq(userLink.id, data.targetUserLinkId))
        await logModerationAction({
            actorUserLinkId: userLinkId,
            action: "admin.grant",
            target: data.targetUserLinkId,
        })
        return { success: true as const }
    })

// any admin can revoke a plain 'admin'. A super_admin row is never
// touched here, revoking one requires the founder (demoteSuperAdmin)
export const revokeAdmin = createServerFn({ method: "POST" })
    .middleware([AdminMiddleware])
    .validator(revokeAdminSchema)
    .handler(async ({ data, context }) => {
        const { userLinkId } = context
        assertNotDecoy(context)
        await assertWriteRateLimit(userLinkId)
        await assertTurnstileVerified(data.turnstileToken)
        const [target] = await db
            .select({ role: userLink.adminRole })
            .from(userLink)
            .where(eq(userLink.id, data.userLinkId))
        if (!target?.role) {
            throw new Response("Not an admin", { status: 404 })
        }
        if (target.role === "super_admin") {
            throw new Response(
                "A super admin's access can only be changed by the founder",
                { status: 403 }
            )
        }
        await db
            .update(userLink)
            .set({ adminRole: null, adminGrantedBy: null, adminGrantedAt: null })
            .where(eq(userLink.id, data.userLinkId))
        await logModerationAction({
            actorUserLinkId: userLinkId,
            action: "admin.revoke",
            target: data.userLinkId,
        })
        return { success: true as const }
    })

// founder only: promotes an existing admin, or a plain user, straight
// to super_admin (engineer's explicit call, 2026-09-25: any super admin
// role change goes through the founder alone)
export const grantSuperAdmin = createServerFn({ method: "POST" })
    .middleware([FounderMiddleware])
    .validator(grantSuperAdminSchema)
    .handler(async ({ data, context }) => {
        const { userLinkId } = context
        assertNotDecoy(context)
        await assertWriteRateLimit(userLinkId)
        await assertTurnstileVerified(data.turnstileToken)
        if (data.targetUserLinkId === userLinkId) {
            throw new Response("You're already the founding super admin", {
                status: 422,
            })
        }
        const [existing] = await db
            .select({ role: userLink.adminRole })
            .from(userLink)
            .where(eq(userLink.id, data.targetUserLinkId))
        if (!existing) {
            throw new Response("Not found", { status: 404 })
        }
        if (existing.role === "super_admin") {
            throw new Response("Already a super admin", { status: 409 })
        }
        // an existing admin keeps their original grantor and date; a plain
        // user gets both set now
        await db
            .update(userLink)
            .set(
                existing.role
                    ? { adminRole: "super_admin" }
                    : {
                          adminRole: "super_admin",
                          adminGrantedBy: userLinkId,
                          adminGrantedAt: new Date(),
                      }
            )
            .where(eq(userLink.id, data.targetUserLinkId))
        await logModerationAction({
            actorUserLinkId: userLinkId,
            action: "superAdmin.grant",
            target: data.targetUserLinkId,
        })
        return { success: true as const }
    })

// founder only. The founder's own row (grantedBy null) can never be
// demoted, by anyone, including themselves; every other super admin can
// be, back down to a plain admin, not removed outright
export const demoteSuperAdmin = createServerFn({ method: "POST" })
    .middleware([FounderMiddleware])
    .validator(demoteSuperAdminSchema)
    .handler(async ({ data, context }) => {
        const { userLinkId } = context
        assertNotDecoy(context)
        await assertWriteRateLimit(userLinkId)
        await assertTurnstileVerified(data.turnstileToken)
        const [target] = await db
            .select({
                role: userLink.adminRole,
                grantedBy: userLink.adminGrantedBy,
            })
            .from(userLink)
            .where(eq(userLink.id, data.userLinkId))
        if (!target || target.role !== "super_admin") {
            throw new Response("Not a super admin", { status: 404 })
        }
        if (target.grantedBy === null) {
            throw new Response("The founder can never be demoted", {
                status: 403,
            })
        }
        await db
            .update(userLink)
            .set({ adminRole: "admin" })
            .where(eq(userLink.id, data.userLinkId))
        await logModerationAction({
            actorUserLinkId: userLinkId,
            action: "superAdmin.demote",
            target: data.userLinkId,
        })
        return { success: true as const }
    })

// admin only. Banning an admin or super admin is refused outright, an
// admin's access has to be removed first (revokeAdmin / demoteSuperAdmin
// then a founder-only path), so an admin can never lock out a peer by
// banning their account instead
export const banUser = createServerFn({ method: "POST" })
    .middleware([AdminMiddleware])
    .validator(banUserSchema)
    .handler(async ({ data, context }) => {
        const { userLinkId } = context
        assertNotDecoy(context)
        await assertWriteRateLimit(userLinkId)
        await assertTurnstileVerified(data.turnstileToken)
        if (data.targetUserLinkId === userLinkId) {
            throw new Response("Cannot ban yourself", { status: 422 })
        }
        if (await isAdmin(data.targetUserLinkId)) {
            throw new Response(
                "Remove their admin access before banning them",
                { status: 422 }
            )
        }
        await db
            .update(userLink)
            .set({
                bannedAt: new Date(),
                bannedBy: userLinkId,
                banReason: data.reason,
            })
            .where(eq(userLink.id, data.targetUserLinkId))
        await logModerationAction({
            actorUserLinkId: userLinkId,
            action: "user.ban",
            target: data.targetUserLinkId,
        })
        return { success: true as const }
    })

export const unbanUser = createServerFn({ method: "POST" })
    .middleware([AdminMiddleware])
    .validator(unbanUserSchema)
    .handler(async ({ data, context }) => {
        const { userLinkId } = context
        assertNotDecoy(context)
        await assertWriteRateLimit(userLinkId)
        await assertTurnstileVerified(data.turnstileToken)
        await db
            .update(userLink)
            .set({ bannedAt: null, bannedBy: null, banReason: null })
            .where(eq(userLink.id, data.userLinkId))
        await logModerationAction({
            actorUserLinkId: userLinkId,
            action: "user.unban",
            target: data.userLinkId,
        })
        return { success: true as const }
    })
