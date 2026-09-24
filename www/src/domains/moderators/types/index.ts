import { z } from "zod"

// the only way below two moderators is a direct database operation the
// engineer performs deliberately (spec 0002 key invariants)
export const MODERATOR_FLOOR = 2

export const grantModeratorSchema = z.object({
    targetUserLinkId: z.string().min(1),
    turnstileToken: z.string(),
})

export const revokeModeratorSchema = z.object({
    userLinkId: z.string().min(1),
    turnstileToken: z.string(),
})
