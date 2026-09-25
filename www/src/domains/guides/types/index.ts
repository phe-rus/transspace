import { z } from "zod"
import { GUIDE_CATEGORIES } from "@/data/guides"

export const GUIDE_STATUSES = ["pending", "published", "rejected"] as const

export type GuideStatus = (typeof GUIDE_STATUSES)[number]

// 422, not a generic validator failure, so the spec's own error
// contract (spec 0004 API surface) stays explicit (spec 0004 AC-7)
export function assertValidGuideCategory(
    category: string
): asserts category is (typeof GUIDE_CATEGORIES)[number] {
    if (
        !(GUIDE_CATEGORIES as readonly string[]).includes(category)
    ) {
        throw new Response("Unknown category", { status: 422 })
    }
}

const contentRefSchema = {
    id: z.string().min(1),
}

export const listGuidesSchema = z.object({
    category: z.string().optional(),
    search: z.string().optional(),
    status: z.enum(GUIDE_STATUSES).optional(),
    cursor: z.string().optional(),
    limit: z.number().int().min(1).max(50).optional(),
})

export const getGuideSchema = z.object(contentRefSchema)

export const submitGuideSchema = z.object({
    title: z.string().min(1),
    excerpt: z.string().min(1),
    category: z.string().min(1),
    bodyContent: z.unknown(),
    relatedResourceIds: z.array(z.string()).max(10).optional(),
    turnstileToken: z.string(),
})

export const publishGuideSchema = z.object({
    ...contentRefSchema,
    turnstileToken: z.string(),
})

export const rejectGuideSchema = z.object({
    ...contentRefSchema,
    turnstileToken: z.string(),
})
