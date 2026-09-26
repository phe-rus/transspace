import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"
import { userLink } from "./user-link"

// append only: never updated or deleted (spec 0002 AC-2, key invariants).
// Moderator status and the admin role are columns on userLink (spec 0008)
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
