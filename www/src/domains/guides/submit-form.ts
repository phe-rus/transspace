import { z } from "zod"
import { AUTHOR_VISIBILITIES } from "@/data/stories"

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
    // fetched on demand from the app-wide Turnstile widget at submit
    // time via useTurnstileToken(), not held in form state
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
