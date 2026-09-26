import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"
import { userLink } from "./user-link"

// floor of two enforced in application code (domains/moderators/func.ts),
// never in the schema: a revoke is rejected outright if it would drop the
// count below two, per spec 0002 AC-2
export const moderators = sqliteTable("moderators", {
    userLinkId: text("userLinkId")
        .primaryKey()
        .references(() => userLink.id),
    grantedBy: text("grantedBy").references(() => userLink.id),
    grantedAt: integer("grantedAt", { mode: "timestamp_ms" })
        .notNull(),
    // ISO 3166-1 alpha-2, set by whoever grants moderator status. Null
    // means a general moderator with no country scope (sees everything,
    // same as before this column existed). This is a soft routing hint
    // for the moderation queue's default view, never a hard access
    // check: any moderator can still act on any post through the API
    // (engineer's explicit call, 2026-09-25)
    countryCode: text("countryCode"),
})

// the system administrator role: full privileges everywhere a moderator
// has them (isModerator() treats an admin row as moderator too), plus
// admin-exclusive capabilities (granting/revoking moderator status,
// bypassing the self-review block). role is 'admin' or 'super_admin':
// any admin can promote someone to 'admin', but only the founder (the
// one row with grantedBy null, the very first account ever created,
// seeded by lib/auth.ts's account.create.after hook) can promote or
// demote a 'super_admin'. The founder itself can never be demoted or
// removed by anyone, including itself (engineer's explicit call,
// 2026-09-25, superseding the earlier "grantedBy null = the one super
// admin" model). No floor here (unlike moderators): an admin is never
// auto-demoted or blocked from being the last one.
export const admins = sqliteTable("admins", {
    userLinkId: text("userLinkId")
        .primaryKey()
        .references(() => userLink.id),
    role: text("role").notNull().default("admin"),
    grantedBy: text("grantedBy").references(() => userLink.id),
    grantedAt: integer("grantedAt", { mode: "timestamp_ms" })
        .notNull(),
})

// append only: never updated or deleted (spec 0002 AC-2, key invariants)
export const moderationAction = sqliteTable("moderationAction", {
    id: text("id").primaryKey(),
    actorUserLinkId: text("actorUserLinkId")
        .notNull()
        .references(() => userLink.id),
    action: text("action").notNull(),
    target: text("target"),
    createdAt: integer("createdAt", { mode: "timestamp_ms" })
        .notNull(),
})
