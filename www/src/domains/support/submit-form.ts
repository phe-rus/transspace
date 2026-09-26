import { z } from "zod"
import { SUPPORT_VISIBILITY_TIERS } from "@/data/support-types"

export const submitSupportFormSchema = z.object({
    type: z.string(),
    title: z.string().min(1),
    isUrgent: z.boolean(),
    isRecurring: z.boolean(),
    visibilityTier: z.enum(SUPPORT_VISIBILITY_TIERS),
    // required on every post regardless of type, self-declared rather
    // than inferred from the visitor's IP (spec 0005 follow-up, the
    // engineer's explicit call, 2026-09-25)
    requestorCountryCode: z.string().length(2, "Choose your country"),
    // one flat bag for whatever the current type's structured fields are;
    // kept generic since the shape depends on `type` (spec 0005 Per-type
    // structuredDetails fields). Text and select fields hold strings, long
    // text fields hold a rich text document
    fields: z.record(z.string(), z.unknown()),
})

export const submitSupportFormDefaults: z.input<
    typeof submitSupportFormSchema
> = {
    type: "",
    title: "",
    isUrgent: false,
    isRecurring: false,
    visibilityTier: "public",
    requestorCountryCode: "",
    fields: {},
}
