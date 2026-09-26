import { z } from "zod"
import { containsNode, isRichDoc, plainText, type RichDoc } from "@/data/rich-text"
import {
    SUPPORT_POST_TYPES,
    SUPPORT_POST_STATUSES,
    SUPPORT_VISIBILITY_TIERS,
    SUPPORT_CLAIM_STATUSES,
    SUPPORT_UPDATE_KINDS,
    directionForType,
    type SupportPostType,
} from "@/data/support-types"

export {
    SUPPORT_POST_TYPES,
    SUPPORT_POST_STATUSES,
    SUPPORT_VISIBILITY_TIERS,
    SUPPORT_CLAIM_STATUSES,
    SUPPORT_UPDATE_KINDS,
    directionForType,
}
export type {
    SupportPostType,
    SupportPostStatus,
    SupportVisibilityTier,
    SupportDirection,
    SupportClaimStatus,
    SupportUpdateKind,
} from "@/data/support-types"

// 422, not a generic validator failure, so the spec's own error contract
// stays explicit (spec 0005 AC-1, matches assertValidCategory's shape)
export function assertValidSupportType(
    type: string
): asserts type is SupportPostType {
    if (!(SUPPORT_POST_TYPES as readonly string[]).includes(type)) {
        throw new Response("Unknown support post type", { status: 422 })
    }
}

// a long text field: either the legacy plain string or a rich text document
// from the editor. The length rules apply to the readable text, and a
// document is bounded and image free (a post never carries an uploaded
// image, which could leak where it was taken)
const MAX_RICH_BYTES = 40_000
const richText = (min = 1) =>
    z
        .union([z.string(), z.custom<RichDoc>(isRichDoc)])
        .refine((value) => plainText(value).trim().length >= min, {
            message: `Write at least ${min} characters`,
        })
        .refine(
            (value) =>
                typeof value === "string" ||
                JSON.stringify(value).length <= MAX_RICH_BYTES,
            { message: "This is too long" }
        )
        .refine((value) => !containsNode(value, "image"), {
            message: "Images are not allowed in a post",
        })

// per-type structuredDetails shape (spec 0005, Per-type structuredDetails
// fields table). Every field required unless marked optional there.
const structuredDetailsSchemas = {
    request_general: z.object({
        description: richText(50),
        format: z.string().optional(),
    }),
    request_info: z.object({
        description: richText(),
    }),
    request_food: z.object({
        description: richText(),
        portions: z.string().optional(),
    }),
    request_financial: z.object({
        writtenCase: richText(200),
        // integer minor units (e.g. cents)
        targetAmount: z.number().int().min(1),
        currency: z
            .string()
            .regex(/^[A-Z]{3}$/, "Use a 3 letter ISO 4217 currency code"),
    }),
    request_travel: z.object({
        description: richText(),
        area: z.string().min(1),
        timeframe: z.string().min(1),
    }),
    offer_job: z.object({
        role: z.string().min(1),
        compensation: z.string().min(1),
        remoteOrLocal: z.enum(["remote", "local", "hybrid"]),
        about: richText().optional(),
        howToApply: richText(),
        org: z.string().optional(),
    }),
    offer_travel: z.object({
        area: z.string().min(1),
        timeframe: z.string().min(1),
        whatIsOffered: richText(),
    }),
    offer_listening: z.object({
        availability: z.string().min(1),
        format: z.string().optional(),
        languages: z.string().optional(),
        topics: z.string().optional(),
    }),
    offer_general: z.object({
        description: richText(),
    }),
    offer_professional: z.object({
        profession: z.string().min(1),
        licenseOrRegistrationNumber: z.string().min(1),
        jurisdiction: z.string().min(1),
        format: z.string().optional(),
        context: richText().optional(),
    }),
} as const satisfies Record<SupportPostType, z.ZodType>

// validates a submission's structuredDetails against its own type's
// schema; a submission missing a required field is rejected with 422
// (spec 0005 AC-1, key invariants). Never trusts the client's shape as-is.
export function parseStructuredDetails(
    type: SupportPostType,
    details: unknown
): Record<string, unknown> {
    const schema = structuredDetailsSchemas[type]
    const result = schema.safeParse(details)
    if (!result.success) {
        throw new Response("Invalid structured details", { status: 422 })
    }
    return result.data as Record<string, unknown>
}

const idSchema = { id: z.string().min(1) }
const turnstileSchema = { turnstileToken: z.string() }

export const listSupportPostsSchema = z.object({
    type: z.enum(SUPPORT_POST_TYPES).optional(),
    direction: z.enum(["request", "offer"]).optional(),
    status: z.enum(SUPPORT_POST_STATUSES).optional(),
    // true only lists a caller's own posts; not otherwise filterable by
    // author (spec 0005 AC-18)
    mine: z.boolean().optional(),
    includeFulfilled: z.boolean().optional(),
    // moderation queue's soft country filter (moderator only, see
    // ModeratorMiddleware-gated list handlers); never restricts a
    // regular caller's own read
    countryCode: z.string().length(2).optional(),
    cursor: z.string().optional(),
    limit: z.number().int().min(1).max(50).optional(),
})

export const getSupportPostSchema = z.object(idSchema)

export const submitSupportPostSchema = z.object({
    type: z.enum(SUPPORT_POST_TYPES),
    title: z.string().min(1).max(200),
    structuredDetails: z.record(z.string(), z.unknown()),
    visibilityTier: z.enum(SUPPORT_VISIBILITY_TIERS),
    // ISO 3166-1 alpha-2, self-declared, required on every post
    // regardless of type (engineer's explicit call, 2026-09-25): the
    // country-scoped moderation queue and security/clearance review
    // both key off this
    requestorCountryCode: z.string().length(2),
    isUrgent: z.boolean().optional(),
    // spec 0005 AC-20: an ongoing/standing offer (e.g. a recurring
    // listening-ear availability), carried over from the original
    // mockup's MutualAidPost.recurring field
    isRecurring: z.boolean().optional(),
    ...turnstileSchema,
})

export const editSupportPostSchema = z.object({
    ...idSchema,
    title: z.string().min(1).max(200).optional(),
    structuredDetails: z.record(z.string(), z.unknown()).optional(),
    visibilityTier: z.enum(SUPPORT_VISIBILITY_TIERS).optional(),
    ...turnstileSchema,
})

export const withdrawSupportPostSchema = z.object({
    ...idSchema,
    reason: z.string().optional(),
    ...turnstileSchema,
})

export const fulfillSupportPostSchema = z.object({
    ...idSchema,
    ...turnstileSchema,
})

export const publishSupportPostSchema = z.object({
    ...idSchema,
    ...turnstileSchema,
})

export const coSignSupportPostSchema = z.object({
    ...idSchema,
    ...turnstileSchema,
})

export const verifySupportPostSchema = z.object({
    ...idSchema,
    ...turnstileSchema,
})

export const rejectSupportPostSchema = z.object({
    ...idSchema,
    reason: z.string().min(1),
    ...turnstileSchema,
})

export const pauseSupportPostSchema = z.object({
    ...idSchema,
    reason: z.string().min(1),
    ...turnstileSchema,
})

export const reactivateSupportPostSchema = z.object({
    ...idSchema,
    note: z.string().optional(),
    ...turnstileSchema,
})

export const escalateTierSupportPostSchema = z.object({
    ...idSchema,
    visibilityTier: z.enum(SUPPORT_VISIBILITY_TIERS),
    ...turnstileSchema,
})

export const createClaimSchema = z.object({
    ...idSchema,
    message: z.string().optional(),
    ...turnstileSchema,
})

const claimRefSchema = {
    id: z.string().min(1),
    claimId: z.string().min(1),
}

export const withdrawClaimSchema = z.object({
    ...claimRefSchema,
    ...turnstileSchema,
})

export const assignClaimSchema = z.object({
    ...claimRefSchema,
    ...turnstileSchema,
})

export const declineClaimSchema = z.object({
    ...claimRefSchema,
    ...turnstileSchema,
})

export const postSupportUpdateSchema = z.object({
    ...idSchema,
    kind: z.enum(SUPPORT_UPDATE_KINDS),
    amount: z.number().int().min(0).optional(),
    body: z.string().optional(),
    ...turnstileSchema,
})

export const supportPostReadSchema = z.object({
    id: z.string().min(1),
})
