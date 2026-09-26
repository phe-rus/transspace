import { sql } from "drizzle-orm"
import {
    sqliteTable,
    text,
    integer,
    index,
    primaryKey,
    uniqueIndex,
} from "drizzle-orm/sqlite-core"
import { userLink } from "./user-link"

// validated at the domain layer against the shipped SUPPORT_POST_TYPES
// constant, never a DB level enum, same convention as resource.category
// (spec 0005 data model)
export const supportPost = sqliteTable(
    "supportPost",
    {
        id: text("id").primaryKey(),
        type: text("type").notNull(),
        // derived from type at write time (request_* vs offer_*), stored
        // for cheap filtering (spec 0005 data model)
        direction: text("direction").notNull(),
        isUrgent: integer("isUrgent", { mode: "boolean" })
            .notNull()
            .default(false),
        // an ongoing/standing offer (e.g. a recurring listening-ear
        // availability), only valid when direction = offer; renders as a
        // wide, standing card instead of a normal post (spec 0005 AC-20,
        // carried over from the original support page mockup's
        // MutualAidPost.recurring field)
        isRecurring: integer("isRecurring", { mode: "boolean" })
            .notNull()
            .default(false),
        title: text("title").notNull(),
        // public | sensitive | critical | private (spec 0005 AC-4)
        visibilityTier: text("visibilityTier").notNull(),
        // pending | published | rejected | paused | withdrawn | fulfilled
        status: text("status").notNull(),
        authorUserLinkId: text("authorUserLinkId")
            .notNull()
            .references(() => userLink.id),
        // ISO 3166-1 alpha-2, self-declared by the requester/offerer at
        // submit time (never inferred from their IP, which a VPN can
        // misreport): the country-scoped moderation queue routes on
        // this, not on visitor geolocation. Nullable only because rows
        // written before this column existed have none; every new
        // submission requires it at the form layer (engineer's explicit
        // call, 2026-09-25)
        requestorCountryCode: text("requestorCountryCode"),
        // JSON, shape validated per type before every write (spec 0005
        // AC-1, key invariants), never trusted as-is from the client
        structuredDetails: text("structuredDetails").notNull(),
        moderatedBy: text("moderatedBy").references(() => userLink.id),
        moderatedAt: integer("moderatedAt", { mode: "timestamp_ms" }),
        createdAt: integer("createdAt", {
            mode: "timestamp_ms",
        }).notNull(),
        updatedAt: integer("updatedAt", {
            mode: "timestamp_ms",
        }).notNull(),
    },
    (table) => [
        index("supportPost_status_type_idx").on(
            table.status,
            table.type
        ),
        // supports ORDER BY createdAt DESC, id DESC + the composite
        // cursor pattern used by resource/guide list endpoints (spec
        // 0005 Feature design, list ordering)
        index("supportPost_createdAt_id_idx").on(
            table.createdAt,
            table.id
        ),
        // the moderation queue's country filter (a soft default, not a
        // hard access check): scans by requestor country fast instead
        // of a table scan per moderator
        index("supportPost_countryCode_idx").on(
            table.requestorCountryCode
        ),
        // at most one open (pending/published/paused) request_financial
        // post per account, enforced atomically rather than a
        // read-then-write check (spec 0005 AC-7, key invariants)
        uniqueIndex("supportPost_openFinancial_idx")
            .on(table.authorUserLinkId)
            .where(
                sql`${table.type} = 'request_financial' and ${table.status} in ('pending', 'published', 'paused')`
            ),
    ]
)

// interested | assigned | declined | withdrawn (spec 0005 State
// transitions)
export const supportClaim = sqliteTable(
    "supportClaim",
    {
        id: text("id").primaryKey(),
        supportPostId: text("supportPostId")
            .notNull()
            .references(() => supportPost.id),
        helperUserLinkId: text("helperUserLinkId")
            .notNull()
            .references(() => userLink.id),
        status: text("status").notNull(),
        message: text("message"),
        createdAt: integer("createdAt", {
            mode: "timestamp_ms",
        }).notNull(),
        assignedAt: integer("assignedAt", { mode: "timestamp_ms" }),
        assignedBy: text("assignedBy").references(() => userLink.id),
    },
    (table) => [
        // at most one claim per person per post (spec 0005 AC-10, key
        // invariants)
        uniqueIndex("supportClaim_post_helper_idx").on(
            table.supportPostId,
            table.helperUserLinkId
        ),
        // at most one assigned claim per post, enforced atomically;
        // assigning a new one first resets the previous assignee to
        // interested (spec 0005 AC-10, key invariants)
        uniqueIndex("supportClaim_assigned_idx")
            .on(table.supportPostId)
            .where(sql`${table.status} = 'assigned'`),
    ]
)

// progress | pause_reason | pause_response | reactivation_note |
// withdrawal_reason | rejection_reason | moderator_note (spec 0005
// Feature design, data model sketch)
export const supportUpdate = sqliteTable(
    "supportUpdate",
    {
        id: text("id").primaryKey(),
        supportPostId: text("supportPostId")
            .notNull()
            .references(() => supportPost.id),
        authorUserLinkId: text("authorUserLinkId")
            .notNull()
            .references(() => userLink.id),
        kind: text("kind").notNull(),
        // integer minor units (e.g. cents); only meaningful for
        // kind = progress, the new cumulative self-reported total, not a
        // delta (spec 0005 AC-11)
        amount: integer("amount"),
        body: text("body"),
        createdAt: integer("createdAt", {
            mode: "timestamp_ms",
        }).notNull(),
    },
    (table) => [
        index("supportUpdate_post_createdAt_idx").on(
            table.supportPostId,
            table.createdAt
        ),
    ]
)

// which moderator has opened which post in the inbox. A row means read, no
// row means unread, and each moderator keeps their own. The rows for a post
// are cleared whenever it changes stage (published, rejected, paused), so
// the next stage starts unread instead of inheriting "seen" from the last
export const supportPostRead = sqliteTable(
    "supportPostRead",
    {
        moderatorUserLinkId: text("moderatorUserLinkId")
            .notNull()
            .references(() => userLink.id),
        supportPostId: text("supportPostId")
            .notNull()
            .references(() => supportPost.id),
        readAt: integer("readAt", { mode: "timestamp_ms" }).notNull(),
    },
    (table) => [
        primaryKey({
            columns: [table.moderatorUserLinkId, table.supportPostId],
        }),
        // clearing every moderator's marks for one post
        index("supportPostRead_post_idx").on(table.supportPostId),
    ]
)
