import { z } from "zod"

export const grantAdminSchema = z.object({
    targetUserLinkId: z.string().min(1),
})

export const revokeAdminSchema = z.object({
    userLinkId: z.string().min(1),
})

export const grantSuperAdminSchema = z.object({
    targetUserLinkId: z.string().min(1),
})

export const demoteSuperAdminSchema = z.object({
    userLinkId: z.string().min(1),
})

export const banUserSchema = z.object({
    targetUserLinkId: z.string().min(1),
    reason: z.string().min(1),
})

export const unbanUserSchema = z.object({
    userLinkId: z.string().min(1),
})
