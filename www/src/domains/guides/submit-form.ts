import { z } from "zod"

export const submitGuideFormSchema = z.object({
    title: z.string().min(1),
    excerpt: z.string().min(1),
    category: z.string().min(1),
    bodyContent: z.unknown(),
    seriesTitle: z.string().optional(),
    seriesOrder: z.number().int().min(1).optional(),
    coverImageUrl: z.string().optional(),
    videoUrl: z.string().optional(),
    turnstileToken: z.string().min(1),
})

export const submitGuideDefaults: z.input<typeof submitGuideFormSchema> = {
    title: "",
    excerpt: "",
    category: "",
    bodyContent: null,
    seriesTitle: "",
    seriesOrder: undefined,
    coverImageUrl: "",
    videoUrl: "",
    turnstileToken: "",
}
