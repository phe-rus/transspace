import { z } from "zod"

export const submitFormSchema = z.object({
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
    // fetched on demand from the app-wide Turnstile widget at submit
    // time via useTurnstileToken(), not held in form state
})

export const submitFormDefaults: z.input<typeof submitFormSchema> = {
    name: "",
    category: "",
    subcategory: "",
    countryName: "",
    city: "",
    description: "",
    estimate: "",
    contact: "",
    internationalAccess: false,
    isFree: false,
}
