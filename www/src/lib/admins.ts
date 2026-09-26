import { and, eq, isNull } from "drizzle-orm"
import { db } from "@/db"
import { admins } from "@/schemas/moderation"

export async function isAdmin(userLinkId: string): Promise<boolean> {
    const [row] = await db
        .select({ userLinkId: admins.userLinkId })
        .from(admins)
        .where(eq(admins.userLinkId, userLinkId))
    return Boolean(row)
}

// role = 'super_admin': the founder (see isFounder below) plus anyone
// the founder has promoted. A super admin has every admin privilege,
// but managing the super admin roster itself (promoting or demoting
// one) is narrower, see isFounder.
export async function isSuperAdmin(userLinkId: string): Promise<boolean> {
    const [row] = await db
        .select({ userLinkId: admins.userLinkId })
        .from(admins)
        .where(
            and(eq(admins.userLinkId, userLinkId), eq(admins.role, "super_admin"))
        )
    return Boolean(row)
}

// the one admin row with no grantor: the very first account ever
// created, seeded by lib/auth.ts's bootstrap hook. Exclusively theirs
// is promoting or demoting a super admin (engineer's explicit call,
// 2026-09-25); every other admin, including a promoted super admin, can
// never touch the super admin roster, and the founder can never be
// demoted or removed by anyone, including themselves.
export async function isFounder(userLinkId: string): Promise<boolean> {
    const [row] = await db
        .select({ userLinkId: admins.userLinkId })
        .from(admins)
        .where(and(eq(admins.userLinkId, userLinkId), isNull(admins.grantedBy)))
    return Boolean(row)
}
