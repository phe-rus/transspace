import { sql } from "drizzle-orm"
import {
    sqliteTable,
    text,
    integer,
    index,
    uniqueIndex,
} from "drizzle-orm/sqlite-core"
import { userLink } from "./user-link"

// dynamically created the first time a guide submission names one
// (spec 0004 AC-10): no pre-seeded list. Uniqueness is a functional
// lowercase index, mirroring country's find-or-create shape (spec
// 0003 Decision, Value sourcing).
export const guideSeries = sqliteTable(
    "guide_series",
    {
        id: text("id").primaryKey(),
        title: text("title").notNull(),
        description: text("description"),
        createdAt: integer("createdAt", {
            mode: "timestamp_ms",
        }).notNull(),
    },
    (table) => [
        uniqueIndex("guideSeries_titleLower_idx").on(
            sql`lower(${table.title})`
        ),
    ]
)

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
        // guide or story (spec 0007): a story is a guide row with a topic in
        // `category` and an identity choice below, so moderation, trust and
        // the rich text checks are shared. Reads default to guide
        kind: text("kind").notNull().default("guide"),
        // profile or anonymous, required for a story: anonymous never
        // returns a writer name from any read (spec 0007 AC-4)
        authorVisibility: text("authorVisibility"),
        // a community thread's type (spec 0010): required when kind is
        // thread, always null for a guide or a story. Validated against
        // THREAD_TYPES at the domain layer
        threadType: text("threadType"),
        // a community thread's last activity (spec 0010 AC-3, AC-8): set
        // when it publishes, moved by every new reply. Null until then
        lastActivityAt: integer("lastActivityAt", { mode: "timestamp_ms" }),
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
        // find-or-create at submission, never a raw client id (spec
        // 0004 AC-10)
        seriesId: text("seriesId").references(() => guideSeries.id),
        // the submitter's own stated position within the series, a
        // display hint only, not enforced unique/contiguous (spec
        // 0004 AC-10, Follow-up)
        seriesOrder: integer("seriesOrder"),
        // same same-origin /api/uploads/ rule as an in-body image
        // (spec 0004 AC-9, AC-10)
        coverImageUrl: text("coverImageUrl"),
        // validated against a fixed embeddable-provider allowlist at
        // submission, never rendered from unvalidated input (spec
        // 0004 AC-10)
        videoUrl: text("videoUrl"),
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
        // a community's thread list, newest activity first (spec 0010)
        index("guide_thread_idx").on(
            table.kind,
            table.category,
            table.status,
            table.lastActivityAt
        ),
        // supports listing a series in order (spec 0004 AC-10)
        index("guide_seriesId_seriesOrder_idx").on(
            table.seriesId,
            table.seriesOrder
        ),
    ]
)
