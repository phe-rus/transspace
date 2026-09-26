import { z } from "zod"
import {
    RESOURCE_CATEGORIES,
    RESOURCE_SUBCATEGORIES_BY_CATEGORY,
    RESOURCE_TIERS,
    type ResourceCategory,
} from "@/data/resource-categories"

export const RESOURCE_STATUSES = [
    "pending",
    "published",
    "rejected",
] as const

export type ResourceStatus = (typeof RESOURCE_STATUSES)[number]

// 422, not a generic validator failure, so the spec's own error
// contract (spec 0003 API surface) stays explicit (spec 0003 AC-7)
export function assertValidCategory(
    category: string,
    subcategory: string | null | undefined
): asserts category is ResourceCategory {
    if (
        !RESOURCE_CATEGORIES.includes(category as ResourceCategory)
    ) {
        throw new Response("Unknown category", { status: 422 })
    }
    const allowed =
        RESOURCE_SUBCATEGORIES_BY_CATEGORY[
            category as ResourceCategory
        ]
    if (subcategory && !(allowed as readonly string[]).includes(subcategory)) {
        throw new Response("Unknown subcategory", {
            status: 422,
        })
    }
}

const contentRefSchema = {
    id: z.string().min(1),
}

export const listResourcesSchema = z.object({
    category: z.string().optional(),
    subcategory: z.string().optional(),
    countryId: z.string().optional(),
    // a name typed into the manual location picker (spec 0003 AC-6);
    // countryId above stays for a caller that already knows the id
    country: z.string().optional(),
    city: z.string().optional(),
    search: z.string().optional(),
    verifiedOnly: z.boolean().optional(),
    freeOnly: z.boolean().optional(),
    internationalOnly: z.boolean().optional(),
    tier: z.enum(RESOURCE_TIERS).optional(),
    status: z.enum(RESOURCE_STATUSES).optional(),
    cursor: z.string().optional(),
    limit: z.number().int().min(1).max(50).optional(),
})

export const getResourceSchema = z.object(contentRefSchema)

export const submitResourceSchema = z.object({
    name: z.string().min(1),
    category: z.string().min(1),
    subcategory: z.string().optional(),
    countryName: z.string().min(1),
    city: z.string().min(1),
    description: z.string().min(1),
    estimate: z.string().optional(),
    contact: z.string().optional(),
    internationalAccess: z.boolean().optional(),
    isFree: z.boolean().optional(),
    structuredDetails: z.record(z.string(), z.unknown()).optional(),
    // a submitter may only declare diy; verified is refused in the
    // handler with a 422 (spec 0006 AC-4)
    tier: z.enum(RESOURCE_TIERS).optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
})

export const publishResourceSchema = z.object({
    ...contentRefSchema,
    // undefined leaves the tier as submitted, null clears it (spec 0006
    // AC-5)
    tier: z.enum(RESOURCE_TIERS).nullable().optional(),
})

export const rejectResourceSchema = z.object({
    ...contentRefSchema,
})
