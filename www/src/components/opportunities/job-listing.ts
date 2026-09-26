import {
  parseDetails,
  snippetText,
  type InboxItem,
} from "@/components/inbox/inbox-item"
import { plainText } from "@/data/rich-text"

export type JobMode = "remote" | "local" | "hybrid"

export type JobListing = {
  id: string
  title: string
  org: string | null
  role: string | null
  compensation: string | null
  mode: JobMode | null
  countryCode: string | null
  summary: string
  urgent: boolean
}

function field(details: Record<string, unknown>, key: string): string | null {
  const text = plainText(details[key]).trim()
  return text === "" ? null : text
}

// Jobs and careers are the offer_job support posts. A signed out visitor
// gets the redacted projection (title only), so every detail is optional
export function toJobListing(item: {
  id: string
  title: string
  isUrgent: boolean
  requestorCountryCode?: string | null
  structuredDetails?: string | Record<string, unknown>
}): JobListing {
  const details = parseDetails(item.structuredDetails ?? {})
  const mode = field(details, "remoteOrLocal")

  return {
    id: item.id,
    title: item.title,
    org: field(details, "org"),
    role: field(details, "role"),
    compensation: field(details, "compensation"),
    mode: mode === "remote" || mode === "local" || mode === "hybrid" ? mode : null,
    countryCode: item.requestorCountryCode ?? null,
    summary: item.structuredDetails
      ? snippetText({
          ...item,
          type: "offer_job",
          visibilityTier: "public",
          createdAt: new Date(),
          updatedAt: new Date(),
          requestorCountryCode: item.requestorCountryCode ?? null,
          structuredDetails: item.structuredDetails,
        } satisfies InboxItem)
      : "",
    urgent: item.isUrgent,
  }
}
