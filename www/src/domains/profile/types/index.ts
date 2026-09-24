import { z } from "zod"

// spec 0001 Follow up: expand www/public/avatar/ beyond these five
// generic colors into a curated set, an asset/design task, not an
// architecture one. Slugs match the files actually shipped there.
export const AVATAR_SLUGS = [
    "blue-dark",
    "green-dark",
    "orange",
    "red",
    "rose",
] as const

// placeholder starter vocabulary, expanding this is content/design
// work, not an architecture decision, the same treatment spec 0001 gives
// AVATAR_SLUGS
export const TOPICS = [
    "healthcare",
    "housing",
    "legal",
    "mental-health",
    "safety",
    "community",
    "advocacy",
    "resources",
] as const

const RESERVED_TERMS = ["moderator", "admin", "official", "transspace"]

function containsReservedTerm(name: string): boolean {
    const lower = name.toLowerCase()
    return RESERVED_TERMS.some((term) => lower.includes(term))
}

// 2 to 32 characters, no impersonation of a reserved term, checked case
// insensitively as a substring block (spec 0001 Data model sketch)
export const displayNameSchema = z
    .string()
    .min(2)
    .max(32)
    .refine((name) => !containsReservedTerm(name), {
        message: "Display name cannot reference a reserved term",
    })

export const updateProfileSchema = z.object({
    displayName: displayNameSchema.optional(),
    avatarSlug: z.enum(AVATAR_SLUGS).optional(),
    bio: z.string().max(500).optional(),
    pronouns: z.string().max(32).optional(),
    topics: z.array(z.enum(TOPICS)).optional(),
})

export function isOnboarded(row: {
    displayName: string | null
    avatarSlug: string | null
}): boolean {
    return Boolean(row.displayName && row.avatarSlug)
}
