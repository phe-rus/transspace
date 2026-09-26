import { z } from "zod"

// shipped registry (spec 0003 AC-1, data model): every future content
// spec adds its type here rather than inventing a free text value
export const CONTENT_TYPES = [
    "resource",
    "guide",
    "story",
    "opportunity",
    "business",
    // spec 0005: a support_post's trustSignal row is created at publish
    // time, not submission, so an unreviewed financial ask can't
    // accumulate cosigns before a moderator has seen it (spec 0005 AC-6)
    "supportPost",
] as const

export type ContentType = (typeof CONTENT_TYPES)[number]

export const contentTypeSchema = z.enum(CONTENT_TYPES)

// a plain configuration constant, not hard coded logic, so it can be
// tuned later without a schema change (spec 0003 Decision)
export const COMMUNITY_REVIEW_THRESHOLD = 3

// spec 0003 AC-2 concrete defaults
export const CO_SIGN_ACCOUNT_AGE_MS = 7 * 24 * 60 * 60 * 1000
export const CO_SIGN_DAILY_LIMIT = 10

// 422, not a generic validator failure, so the spec's own error contract
// (spec 0003 API surface) stays explicit rather than depending on however
// the framework happens to map an unrelated schema mismatch
export function assertValidContentType(
    contentType: string
): asserts contentType is ContentType {
    if (!CONTENT_TYPES.includes(contentType as ContentType)) {
        throw new Response("Unknown content type", {
            status: 422,
        })
    }
}

const contentRefSchema = {
    contentType: z.string().min(1),
    contentId: z.string().min(1),
}

export const getTrustSignalSchema = z.object(contentRefSchema)

export const coSignSchema = z.object({
    ...contentRefSchema,
})

export const verifyTrustSignalSchema = z.object({
    ...contentRefSchema,
})

export const disputeTrustSignalSchema = z.object({
    ...contentRefSchema,
    disputed: z.boolean(),
})
