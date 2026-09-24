import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"
import { userLink } from "./user-link"

// the pseudonymous, public facing profile, one to one with userLink (spec
// 0001 Data model sketch). display_name/avatar_slug are nullable here,
// required by the onboarding gate at the application layer, not the
// schema (spec 0001).
export const profile = sqliteTable("profile", {
    id: text("id").primaryKey(),
    userLinkId: text("userLinkId")
        .notNull()
        .unique()
        .references(() => userLink.id),
    displayName: text("displayName"),
    avatarSlug: text("avatarSlug"),
    bio: text("bio"),
    pronouns: text("pronouns"),
    // JSON array in one text column, since D1 has no native array type (spec
    // 0001 Data model sketch)
    topics: text("topics"),
    deletedAt: integer("deletedAt", { mode: "timestamp_ms" }),
})
