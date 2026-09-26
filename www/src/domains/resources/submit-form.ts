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
    // a submitter can only declare a DIY or peer run option (spec 0006)
    isDiy: z.boolean().optional(),
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
    isDiy: false,
}
