import { z } from "zod"
import { GUIDE_CATEGORIES } from "@/data/guides"
import { AUTHOR_VISIBILITIES, STORY_TOPICS } from "@/data/stories"
import { THREAD_TYPES } from "@/data/communities"
import { RETENTION_HOURS } from "@/data/live-room"

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

export const GUIDE_KINDS = ["guide", "story"] as const

export type GuideKind = (typeof GUIDE_KINDS)[number]

// a guide category for a guide, a story topic for a story; the wrong list
// for the kind is a 422 (spec 0007 AC-5)
export function assertValidCategoryForKind(
    kind: GuideKind,
    category: string
): void {
    const allowed: readonly string[] =
        kind === "story" ? STORY_TOPICS : GUIDE_CATEGORIES
    if (!allowed.includes(category)) {
        throw new Response("Unknown category", { status: 422 })
    }
}

const contentRefSchema = {
    id: z.string().min(1),
}

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const listGuidesSchema = z.object({
    // defaults to guide on the server, so stories never leak into guides
    kind: z.enum(GUIDE_KINDS).optional(),
    category: z.string().optional(),
    search: z.string().optional(),
    status: z.enum(GUIDE_STATUSES).optional(),
    cursor: z.string().optional(),
    limit: z.number().int().min(1).max(50).optional(),
})

export const getGuideSchema = z.object(contentRefSchema)

export const listGuideSeriesSchema = z.object({
    search: z.string().optional(),
})

export const submitGuideSchema = z.object({
    // client-generated before the first in-editor upload, since
    // composing (and uploading images under this id) happens before
    // the guide row itself exists (spec 0004 AC-10 follow-up)
    id: z.string().regex(UUID_RE),
    title: z.string().min(1),
    excerpt: z.string().min(1),
    kind: z.enum(GUIDE_KINDS).optional(),
    category: z.string().min(1),
    // required for a story (spec 0007 AC-4), ignored for a guide
    authorVisibility: z.enum(AUTHOR_VISIBILITIES).optional(),
    bodyContent: z.unknown(),
    relatedResourceIds: z.array(z.string()).max(10).optional(),
    // find-or-create by title, spec 0004 AC-10
    seriesTitle: z.string().min(1).optional(),
    seriesOrder: z.number().int().min(1).optional(),
    coverImageUrl: z.string().optional(),
    videoUrl: z.string().optional(),
})

export const publishGuideSchema = z.object({
    ...contentRefSchema,
})

export const rejectGuideSchema = z.object({
    ...contentRefSchema,
})

// ---- community threads (spec 0010): guide rows with kind = "thread", the
// community slug in category. Never listed or read through the guide
// endpoints above, which are public; these are all signed in only

export const listThreadsSchema = z.object({
    slug: z.string().min(1),
    threadType: z.enum(THREAD_TYPES).optional(),
    cursor: z.string().optional(),
})

export const getThreadSchema = z.object(contentRefSchema)

export const submitThreadSchema = z.object({
    // client generated, like a guide's, so editor images can upload under
    // it before the row exists
    id: z.string().regex(UUID_RE),
    slug: z.string().min(1),
    title: z.string().trim().min(1),
    excerpt: z.string().trim().min(1),
    threadType: z.enum(THREAD_TYPES),
    authorVisibility: z.enum(AUTHOR_VISIBILITIES),
    bodyContent: z.unknown(),
})

export const setCommunityJoinedSchema = z.object({
    slug: z.string().min(1),
    joined: z.boolean(),
})

export const setRoomRetentionSchema = z.object({
    slug: z.string().min(1),
    hours: z.union(RETENTION_HOURS.map((hours) => z.literal(hours))),
})

export const roomSlugSchema = z.object({
    slug: z.string().min(1),
})
