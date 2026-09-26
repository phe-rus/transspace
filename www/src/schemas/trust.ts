import {
    sqliteTable,
    text,
    integer,
    uniqueIndex,
    primaryKey,
    index,
} from "drizzle-orm/sqlite-core"
import { userLink } from "./user-link"

// content agnostic: content_type is validated at the domain layer against
// the shipped CONTENT_TYPES registry (spec 0003 Decision), content_id is
// opaque since no content table exists yet
export const trustSignal = sqliteTable(
    "trustSignal",
    {
        id: text("id").primaryKey(),
        contentType: text("contentType").notNull(),
        contentId: text("contentId").notNull(),
        submittedAt: integer("submittedAt", {
            mode: "timestamp_ms",
        }).notNull(),
        submittedBy: text("submittedBy")
            .notNull()
            .references(() => userLink.id),
        // never returned by the public read endpoint (spec 0003 AC-6)
        communityReviewed: integer("communityReviewed", {
            mode: "boolean",
        })
            .notNull()
            .default(false),
        // denormalized, kept in sync with trustCoSign on every insert and
        // delete for a fast, auditable badge read (spec 0003 data model)
        coSignCount: integer("coSignCount").notNull().default(0),
        referencesAvailable: integer("referencesAvailable", {
            mode: "boolean",
        })
            .notNull()
            .default(false),
        professionalVerified: integer("professionalVerified", {
            mode: "boolean",
        })
            .notNull()
            .default(false),
        // never returned by the public read endpoint (spec 0003 AC-6)
        professionalVerifiedBy: text(
            "professionalVerifiedBy"
        ).references(() => userLink.id),
        // moderator only override, suppresses communityReviewed
        // regardless of coSignCount (spec 0003 data model)
        disputed: integer("disputed", { mode: "boolean" })
            .notNull()
            .default(false),
        lastReviewedAt: integer("lastReviewedAt", {
            mode: "timestamp_ms",
        }),
    },
    (table) => [
        uniqueIndex("trustSignal_content_idx").on(
            table.contentType,
            table.contentId
        ),
    ]
)

// one co sign per person per item (spec 0003 key invariants)
export const trustCoSign = sqliteTable(
    "trustCoSign",
    {
        trustSignalId: text("trustSignalId")
            .notNull()
            .references(() => trustSignal.id),
        userLinkId: text("userLinkId")
            .notNull()
            .references(() => userLink.id),
        createdAt: integer("createdAt", {
            mode: "timestamp_ms",
        }).notNull(),
    },
    (table) => [
        primaryKey({
            columns: [table.trustSignalId, table.userLinkId],
        }),
    ]
)

// one table for every short text a person writes about a thing or to
// another person (spec 0009 Decision): a comment on published content, a
// direct message, or a report. `kind` is checked on every read.
// contentType/contentId say what a comment or report is about, the same
// content agnostic pair trustSignal uses
export const message = sqliteTable(
    "message",
    {
        id: text("id").primaryKey(),
        // comment | direct | report
        kind: text("kind").notNull(),
        contentType: text("contentType"),
        contentId: text("contentId"),
        // a direct message's recipient, or the person a report is about
        toUserLinkId: text("toUserLinkId").references(() => userLink.id),
        authorUserLinkId: text("authorUserLinkId")
            .notNull()
            .references(() => userLink.id),
        // a reply's parent comment, one level deep (spec 0009 AC-1)
        parentId: text("parentId"),
        // plain text only, 1 to 2000 characters (spec 0009 AC-6)
        body: text("body").notNull(),
        // visible | removed. A removed row never returns its body
        // (spec 0009 AC-3)
        status: text("status").notNull().default("visible"),
        // direct messages only (spec 0009 step two)
        readAt: integer("readAt", { mode: "timestamp_ms" }),
        createdAt: integer("createdAt", {
            mode: "timestamp_ms",
        }).notNull(),
    },
    (table) => [
        index("message_content_idx").on(
            table.kind,
            table.contentType,
            table.contentId,
            table.createdAt
        ),
    ]
)
