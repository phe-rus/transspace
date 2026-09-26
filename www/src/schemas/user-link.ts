import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"

// the one row that exists per person (spec 0002, cross child contract).
// Only the columns [0001] Authentication & identity actually needs to
// build on top of (infra_user_id, the OAuth linkage; storage_prefix, R2
// keying) are defined here; profile/app_lock and the rest of 0001's model
// belong to that feature's own build, not this one.
export const userLink = sqliteTable("userLink", {
    id: text("id").primaryKey(),
    infraUserId: text("infraUserId").unique(),
    storagePrefix: text("storagePrefix").notNull().unique(),
    createdAt: integer("createdAt", { mode: "timestamp_ms" })
        .notNull(),
    deletedAt: integer("deletedAt", { mode: "timestamp_ms" }),
    // a ban blocks sign-in (getCurrentSession treats a banned account as
    // signed out, see middleware/session.ts) without deleting the
    // account or its data, so it can be reversed. Admin-only, never
    // self-service; bannedBy has no FK so a banned admin's own row
    // isn't tangled in the deleted account's foreign key graph
    bannedAt: integer("bannedAt", { mode: "timestamp_ms" }),
    bannedBy: text("bannedBy"),
    banReason: text("banReason"),
})
