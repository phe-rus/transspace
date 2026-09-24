import { sql } from "drizzle-orm"
import {
    sqliteTable,
    text,
    integer,
    real,
    uniqueIndex,
    index,
} from "drizzle-orm/sqlite-core"
import { userLink } from "./user-link"

// dynamically created the first time a submission references it (spec
// 0003 Decision): no pre-seeded list, so a submission can introduce a
// country the directory doesn't cover yet. Uniqueness is a functional
// lowercase index, never a plain unique constraint, so "Uganda" and
// "uganda" can never both exist (spec 0003 Value sourcing).
export const country = sqliteTable(
    "country",
    {
        id: text("id").primaryKey(),
        name: text("name").notNull(),
        createdAt: integer("createdAt", {
            mode: "timestamp_ms",
        }).notNull(),
    },
    (table) => [
        uniqueIndex("country_nameLower_idx").on(
            sql`lower(${table.name})`
        ),
    ]
)

export const resource = sqliteTable(
    "resource",
    {
        id: text("id").primaryKey(),
        name: text("name").notNull(),
        // validated against the shipped RESOURCE_CATEGORIES /
        // RESOURCE_SUBCATEGORIES_BY_CATEGORY constants at the domain
        // layer, never a DB level enum (spec 0003 Value sourcing)
        category: text("category").notNull(),
        subcategory: text("subcategory"),
        countryId: text("countryId")
            .notNull()
            .references(() => country.id),
        city: text("city").notNull(),
        // stored for the future Resource Atlas feature, not rendered by
        // this feature (spec 0003 data model)
        lat: real("lat"),
        lng: real("lng"),
        description: text("description").notNull(),
        estimate: text("estimate"),
        // explicit, set by the submitter, never derived from `estimate`
        // text (spec 0003 AC-7)
        isFree: integer("isFree", { mode: "boolean" })
            .notNull()
            .default(false),
        contact: text("contact"),
        internationalAccess: integer("internationalAccess", {
            mode: "boolean",
        })
            .notNull()
            .default(false),
        // category-specific key/value data (e.g. a pharmacy's
        // medications and dosage ranges); also holds the mock
        // prototype's `services` list under a conventional "services"
        // key. Not validated per category in this build (spec 0003
        // Feature design, Follow-up).
        structuredDetails: text("structuredDetails"),
        // pending | published | rejected. Moderator-only transitions,
        // including a published -> rejected takedown (spec 0003 State
        // transitions)
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
        // functional indexes so GET /resources's keyword search is
        // case-insensitive across non-Latin scripts too, not SQLite's
        // default ASCII-only LIKE folding (spec 0003 Value sourcing)
        index("resource_nameLower_idx").on(sql`lower(${table.name})`),
        index("resource_cityLower_idx").on(sql`lower(${table.city})`),
        // supports ORDER BY createdAt DESC, id DESC + the composite
        // cursor this endpoint uses (spec 0003 Value sourcing)
        index("resource_createdAt_id_idx").on(
            table.createdAt,
            table.id
        ),
        index("resource_status_idx").on(table.status),
    ]
)
