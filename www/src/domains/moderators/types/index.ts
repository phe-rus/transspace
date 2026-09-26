import { z } from "zod"

// the only way below two moderators is a direct database operation the
// engineer performs deliberately (spec 0002 key invariants)
export const MODERATOR_FLOOR = 2

export const grantModeratorSchema = z.object({
    targetUserLinkId: z.string().min(1),
    // ISO 3166-1 alpha-2, optional: unset means a general moderator
    // with no country scope (soft routing only, see schemas/user-link.ts)
    countryCode: z.string().length(2).optional(),
    turnstileToken: z.string(),
})

export const revokeModeratorSchema = z.object({
    userLinkId: z.string().min(1),
    turnstileToken: z.string(),
})

export const setModeratorCountrySchema = z.object({
    userLinkId: z.string().min(1),
    countryCode: z.string().length(2).optional(),
    turnstileToken: z.string(),
})
