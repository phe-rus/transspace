// shipped registry (spec 0005 AC-1, data model): every support post type
// lives here, validated at the domain layer, never a DB level enum, same
// convention as resource categories and guide categories
export const SUPPORT_POST_TYPES = [
    "request_general",
    "request_info",
    "request_food",
    "request_financial",
    "request_travel",
    "offer_job",
    "offer_travel",
    "offer_listening",
    "offer_general",
    "offer_professional",
] as const

export type SupportPostType = (typeof SUPPORT_POST_TYPES)[number]

export const SUPPORT_DIRECTIONS = ["request", "offer"] as const
export type SupportDirection = (typeof SUPPORT_DIRECTIONS)[number]

export function directionForType(type: SupportPostType): SupportDirection {
    return type.startsWith("request_") ? "request" : "offer"
}

// types the country-scoped moderation queue treats as general/skills
// based rather than tied to the requestor's own country: a listening
// ear or a professional's offer isn't inherently local, so every
// moderator sees these regardless of their own country tag (engineer's
// explicit call, 2026-09-25). Every post still records a requestor
// country (data/security clearance purposes), this only affects the
// queue's default routing.
export const COUNTRY_AGNOSTIC_SUPPORT_TYPES: readonly SupportPostType[] = [
    "offer_listening",
    "offer_professional",
]

export const supportPostTypeLabel: Record<SupportPostType, string> = {
    request_general: "General request",
    request_info: "Information / advice",
    request_food: "Food security",
    request_financial: "Financial help",
    request_travel: "Transport / logistics help",
    offer_job: "Job offer",
    offer_travel: "Transport / logistics offer",
    offer_listening: "Listening ear",
    offer_general: "General offer",
    offer_professional: "Professional offer",
}

// least to most restrictive; a moderator may only escalate (move right),
// only the author may move left, via their own edit (spec 0005 AC-5, key
// invariants)
export const SUPPORT_VISIBILITY_TIERS = [
    "public",
    "sensitive",
    "critical",
    "private",
] as const

export type SupportVisibilityTier =
    (typeof SUPPORT_VISIBILITY_TIERS)[number]

export function isMoreRestrictive(
    a: SupportVisibilityTier,
    b: SupportVisibilityTier
): boolean {
    return (
        SUPPORT_VISIBILITY_TIERS.indexOf(a) >
        SUPPORT_VISIBILITY_TIERS.indexOf(b)
    )
}

export const SUPPORT_POST_STATUSES = [
    "pending",
    "published",
    "rejected",
    "paused",
    "withdrawn",
    "fulfilled",
] as const

export type SupportPostStatus = (typeof SUPPORT_POST_STATUSES)[number]

// open per spec 0005 AC-7 / H3: pending, published, and paused all count
// as an open request_financial post; rejected/fulfilled/withdrawn are
// closed
export const OPEN_SUPPORT_POST_STATUSES: readonly SupportPostStatus[] = [
    "pending",
    "published",
    "paused",
]

export const SUPPORT_CLAIM_STATUSES = [
    "interested",
    "assigned",
    "declined",
    "withdrawn",
] as const

export type SupportClaimStatus = (typeof SUPPORT_CLAIM_STATUSES)[number]

export const SUPPORT_UPDATE_KINDS = [
    "progress",
    "pause_reason",
    "pause_response",
    "reactivation_note",
    "withdrawal_reason",
    "rejection_reason",
    "moderator_note",
] as const

export type SupportUpdateKind = (typeof SUPPORT_UPDATE_KINDS)[number]
