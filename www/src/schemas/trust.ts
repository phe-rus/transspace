import {
    sqliteTable,
    text,
    integer,
    uniqueIndex,
    primaryKey,
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
