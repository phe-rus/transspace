import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"
import { userLink } from "./user-link"

// the local unlock PIN and its duress variant, checked entirely against
// this table, never touching Infra (spec 0001 Decision). pinHash/
// duressPinHash are `scrypt` `salt:hash` strings (spec 0001 Data model
// sketch); both are always compared on every verify attempt regardless of
// which matches, so response timing can't reveal which (if either) was
// closer to correct (spec 0001 AC-7, key invariants).
export const appLock = sqliteTable("appLock", {
    userLinkId: text("userLinkId")
        .primaryKey()
        .references(() => userLink.id),
    pinHash: text("pinHash"),
    duressPinHash: text("duressPinHash"),
    failedAttempts: integer("failedAttempts").default(0).notNull(),
    lockedUntil: integer("lockedUntil", { mode: "timestamp_ms" }),
})
