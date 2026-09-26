import { z } from "zod"
import { AUTHOR_VISIBILITIES } from "@/data/stories"
import { THREAD_TYPES } from "@/data/communities"

export const submitGuideFormSchema = z.object({
    title: z.string().min(1),
    excerpt: z.string().min(1),
    category: z.string().min(1),
    bodyContent: z.unknown(),
    // only used by the story form (spec 0007)
    authorVisibility: z.enum(AUTHOR_VISIBILITIES).optional(),
    seriesTitle: z.string().optional(),
    seriesOrder: z.number().int().min(1).optional(),
    coverImageUrl: z.string().optional(),
    videoUrl: z.string().optional(),
})

export const submitGuideDefaults: z.input<typeof submitGuideFormSchema> = {
    title: "",
    excerpt: "",
    category: "",
    bodyContent: null,
    authorVisibility: undefined,
    seriesTitle: "",
    seriesOrder: undefined,
    coverImageUrl: "",
    videoUrl: "",
}

// the start a thread form (spec 0010 AC-4): a community, a thread type, an
// identity choice, and the same rich text body as a story
export const submitThreadFormSchema = z.object({
    slug: z.string().min(1),
    threadType: z.enum(THREAD_TYPES).optional(),
    title: z.string().min(1),
    excerpt: z.string().min(1),
    authorVisibility: z.enum(AUTHOR_VISIBILITIES).optional(),
    bodyContent: z.unknown(),
})

export const submitThreadDefaults: z.input<typeof submitThreadFormSchema> = {
    slug: "",
    threadType: undefined,
    title: "",
    excerpt: "",
    authorVisibility: undefined,
    bodyContent: null,
}
