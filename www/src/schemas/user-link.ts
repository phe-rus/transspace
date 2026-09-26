import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"

// the one row that exists per person (spec 0002, cross child contract),
// and, since spec 0008, the only person table: identity linkage, the
// pseudonymous profile, the app lock PIN state, moderator status and the
// admin role all live here as columns. Every other table points at this
// row. Public reads must select named columns, never the whole row, so
// the private columns (PIN hashes, role grants) never leave the server.
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

    // ---- the pseudonymous, public facing profile (was `profile`, spec
    // 0001). displayName/avatarSlug are nullable here, required by the
    // onboarding gate at the application layer, not the schema. Never
    // select these alongside the private columns below in a public read
    displayName: text("displayName"),
    avatarSlug: text("avatarSlug"),
    bio: text("bio"),
    pronouns: text("pronouns"),
    // JSON array in one text column, since D1 has no native array type
    topics: text("topics"),
    // an optional self reported range (e.g. "18-24"), never a birthdate;
    // shown to a moderator reviewing a support post (spec 0005)
    ageRange: text("ageRange"),

    // ---- the local unlock PIN and its duress variant (was `appLock`,
    // spec 0001). Private: never returned by any read. pinHash and
    // duressPinHash are scrypt `salt:hash` strings, both compared on
    // every verify so timing cannot reveal which matched
    pinHash: text("pinHash"),
    duressPinHash: text("duressPinHash"),
    failedAttempts: integer("failedAttempts").default(0).notNull(),
    lockedUntil: integer("lockedUntil", { mode: "timestamp_ms" }),

    // ---- moderator status (was `moderators`, spec 0002). A value in
    // moderatorGrantedAt means this person is a moderator. The floor of
    // two is enforced in application code, never here. No foreign key on
    // the grantor, like bannedBy, so a removed account never blocks a row
    moderatorGrantedAt: integer("moderatorGrantedAt", { mode: "timestamp_ms" }),
    moderatorGrantedBy: text("moderatorGrantedBy"),
    // ISO 3166-1 alpha-2, a soft routing hint for the moderation queue,
    // never a hard access check. Null means a general moderator
    moderatorCountryCode: text("moderatorCountryCode"),

    // ---- the system administrator role (was `admins`, spec 0002):
    // 'admin' or 'super_admin', null for everyone else. The founder is
    // the one person with a role and no adminGrantedBy, and can never be
    // demoted or removed
    adminRole: text("adminRole"),
    adminGrantedBy: text("adminGrantedBy"),
    adminGrantedAt: integer("adminGrantedAt", { mode: "timestamp_ms" }),
})
