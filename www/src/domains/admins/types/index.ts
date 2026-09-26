import { z } from "zod"

export const grantAdminSchema = z.object({
    targetUserLinkId: z.string().min(1),
    turnstileToken: z.string(),
})

export const revokeAdminSchema = z.object({
    userLinkId: z.string().min(1),
    turnstileToken: z.string(),
})

export const grantSuperAdminSchema = z.object({
    targetUserLinkId: z.string().min(1),
    turnstileToken: z.string(),
})

export const demoteSuperAdminSchema = z.object({
    userLinkId: z.string().min(1),
    turnstileToken: z.string(),
})

export const banUserSchema = z.object({
    targetUserLinkId: z.string().min(1),
    reason: z.string().min(1),
    turnstileToken: z.string(),
})

export const unbanUserSchema = z.object({
    userLinkId: z.string().min(1),
    turnstileToken: z.string(),
})
