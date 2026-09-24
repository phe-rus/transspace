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
