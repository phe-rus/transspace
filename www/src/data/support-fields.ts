import type { SupportPostType } from "./support-types"

export type SupportFieldKind = "text" | "textarea" | "select" | "number"

export interface SupportFieldConfig {
    name: string
    kind: SupportFieldKind
    required: boolean
    minLength?: number
    options?: readonly string[]
}

// mirrors spec 0005's Per-type structuredDetails fields table and the
// Zod schemas in domains/support/types/index.ts exactly; the submit form
// renders from this instead of hardcoding ten separate layouts
export const SUPPORT_FIELDS_BY_TYPE: Record<
    SupportPostType,
    readonly SupportFieldConfig[]
> = {
    request_general: [
        { name: "description", kind: "textarea", required: true, minLength: 50 },
        { name: "format", kind: "text", required: false },
    ],
    request_info: [
        { name: "description", kind: "textarea", required: true },
    ],
    request_food: [
        { name: "description", kind: "textarea", required: true },
        { name: "portions", kind: "text", required: false },
    ],
    request_financial: [
        {
            name: "writtenCase",
            kind: "textarea",
            required: true,
            minLength: 200,
        },
        { name: "targetAmount", kind: "number", required: true },
        { name: "currency", kind: "text", required: true },
    ],
    request_travel: [
        { name: "description", kind: "textarea", required: true },
        { name: "area", kind: "text", required: true },
        { name: "timeframe", kind: "text", required: true },
    ],
    offer_job: [
        { name: "role", kind: "text", required: true },
        { name: "compensation", kind: "text", required: true },
        {
            name: "remoteOrLocal",
            kind: "select",
            required: true,
            options: ["remote", "local", "hybrid"],
        },
        { name: "about", kind: "textarea", required: false },
        { name: "howToApply", kind: "textarea", required: true },
        { name: "org", kind: "text", required: false },
    ],
    offer_travel: [
        { name: "area", kind: "text", required: true },
        { name: "timeframe", kind: "text", required: true },
        { name: "whatIsOffered", kind: "textarea", required: true },
    ],
    offer_listening: [
        { name: "availability", kind: "text", required: true },
        { name: "format", kind: "text", required: false },
        { name: "languages", kind: "text", required: false },
        { name: "topics", kind: "text", required: false },
    ],
    offer_general: [
        { name: "description", kind: "textarea", required: true },
    ],
    offer_professional: [
        { name: "profession", kind: "text", required: true },
        {
            name: "licenseOrRegistrationNumber",
            kind: "text",
            required: true,
        },
        { name: "jurisdiction", kind: "text", required: true },
        { name: "format", kind: "text", required: false },
        { name: "context", kind: "textarea", required: false },
    ],
}
