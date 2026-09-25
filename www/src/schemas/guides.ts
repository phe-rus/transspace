import { sql } from "drizzle-orm"
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core"
import { userLink } from "./user-link"

export const guide = sqliteTable(
    "guide",
    {
        id: text("id").primaryKey(),
        title: text("title").notNull(),
        excerpt: text("excerpt").notNull(),
        // validated against the shipped GUIDE_CATEGORIES constant at
        // the domain layer, never a DB level enum (spec 0004 Value
        // sourcing)
        category: text("category").notNull(),
        // the @pherus/rich-text editor's structured Tiptap content;
        // never raw HTML (spec 0004 data model). Validated at
        // submission (image src allowlist, 256 KB cap, spec 0004 AC-9)
        // before it is ever written here.
        bodyContent: text("bodyContent").notNull(),
        // computed once at submission from bodyContent's text nodes,
        // never recomputed: there is no edit path in this build to
        // make it go stale (spec 0004 Key invariants)
        wordCount: integer("wordCount").notNull(),
        // optional resource ids the submitter picks, capped at 10 and
        // de-duplicated at submission (spec 0004 AC-9); not validated
        // against the resource table's actual contents (Follow-up)
        relatedResourceIds: text("relatedResourceIds"),
        // pending | published | rejected. Moderator-only transitions,
        // including a published -> rejected takedown, identical state
        // machine to resource (spec 0003)
        status: text("status").notNull(),
        submittedBy: text("submittedBy")
            .notNull()
            .references(() => userLink.id),
        createdAt: integer("createdAt", {
            mode: "timestamp_ms",
        }).notNull(),
        updatedAt: integer("updatedAt", {
            mode: "timestamp_ms",
        }).notNull(),
    },
    (table) => [
        // AC-1 searches both title and excerpt, so both need an index
        // (spec 0004 data model)
        index("guide_titleLower_idx").on(sql`lower(${table.title})`),
        index("guide_excerptLower_idx").on(
            sql`lower(${table.excerpt})`
        ),
        // supports ORDER BY createdAt DESC, id DESC + the composite
        // cursor this endpoint uses, same pattern as resource (spec
        // 0004 Value sourcing)
        index("guide_createdAt_id_idx").on(
            table.createdAt,
            table.id
        ),
        index("guide_status_idx").on(table.status),
    ]
)
