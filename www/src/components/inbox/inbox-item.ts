import { isRichDoc, plainText, type RichDoc } from "@/data/rich-text"
import { SUPPORT_FIELDS_BY_TYPE, type SupportFieldKind } from "@/data/support-fields"
import { supportPostTypeLabel, type SupportPostType } from "@/data/support-types"
import { getLocale } from "@/paraglide/runtime"

export type InboxView = "review" | "checkin"

export type InboxItem = {
  id: string
  type: string
  title: string
  isUrgent: boolean
  visibilityTier: string
  createdAt: string | Date
  updatedAt: string | Date
  requestorCountryCode: string | null
  structuredDetails: string | Record<string, unknown>
}

export function typeLabel(type: string): string {
  return supportPostTypeLabel[type as SupportPostType] ?? type
}

// the pending list ships structuredDetails as a raw JSON string, the stale
// list ships it already parsed; both land here
export function parseDetails(
  value: InboxItem["structuredDetails"]
): Record<string, unknown> {
  if (typeof value !== "string") return value ?? {}
  try {
    const parsed: unknown = JSON.parse(value)
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

function formatDetailValue(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (isRichDoc(value)) return plainText(value)
  if (Array.isArray(value)) {
    return value.map(formatDetailValue).filter(Boolean).join(", ")
  }
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

export type DetailEntry = {
  label: string
  // the readable text, used for chips, search and the row snippet
  value: string
  kind: SupportFieldKind
  // set when the field holds an editor document, so the thread can render
  // its lists, checkboxes and formatting instead of flat text
  doc?: RichDoc
}

// "remoteOrLocal" -> "Remote or local"
function detailLabel(key: string): string {
  const words = key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

// the kind comes from the same field config the submit form renders from,
// so a textarea field stays a paragraph and everything else (text, select,
// number) is a chip unless its value is long. A key the config does not
// know is judged by length alone
// targetAmount is stored in minor units next to a separate currency field;
// read together they are one money value, so show it as such
function formatMoney(minorUnits: number, currency: string): string | null {
  try {
    return new Intl.NumberFormat(getLocale(), {
      style: "currency",
      currency,
    }).format(minorUnits / 100)
  } catch {
    return null
  }
}

export function detailEntries(item: InboxItem): DetailEntry[] {
  const fields: readonly { name: string; kind: SupportFieldKind }[] =
    SUPPORT_FIELDS_BY_TYPE[item.type as SupportPostType] ?? []
  const details = parseDetails(item.structuredDetails)
  const money =
    typeof details.targetAmount === "number" &&
    typeof details.currency === "string"
      ? formatMoney(details.targetAmount, details.currency)
      : null

  const order = (key: string) => {
    const index = fields.findIndex((field) => field.name === key)
    return index === -1 ? fields.length : index
  }

  return Object.entries(details)
    .filter(([key]) => !(money && key === "currency"))
    .sort(([a], [b]) => order(a) - order(b))
    .map(([key, value]) => {
      const text =
        money && key === "targetAmount" ? money : formatDetailValue(value)
      const known = fields.find((field) => field.name === key)?.kind
      // a text field holding a sentence or two reads as prose too, so a
      // listening ear (all short text fields on paper) is laid out the same
      // way as a job or a financial ask: chips for the short facts, labelled
      // paragraphs for the rest
      const doc = isRichDoc(value) ? value : undefined
      const prose = doc !== undefined || text.length > 48 || text.includes("\n")
      const kind: SupportFieldKind =
        known === "textarea" || prose ? "textarea" : (known ?? "text")
      return { label: detailLabel(key), value: text, kind, doc }
    })
    .filter((entry) => entry.value !== "")
}

export function isOffer(type: string): boolean {
  return type.startsWith("offer_")
}

export function matchesQuery(item: InboxItem, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return [
    item.title,
    typeLabel(item.type),
    ...detailEntries(item).map((entry) => entry.value),
  ]
    .join(" ")
    .toLowerCase()
    .includes(needle)
}

// the first two sentences of what the post is about: the first paragraph
// style field (description, how to apply, written case...), so a row says
// more than a title. A post with only short fields falls back to those
// values, joined
export function snippetText(item: InboxItem): string {
  const entries = detailEntries(item)
  const body = entries.find((entry) => entry.kind === "textarea")
  if (!body) {
    return entries.map((entry) => entry.value).join(" · ")
  }
  const text = body.value.replace(/\s+/g, " ").trim()
  const sentences = text.match(/[^.!?]+[.!?]+(?=\s|$)/g)
  const snippet = sentences ? sentences.slice(0, 2).join(" ").trim() : text
  return snippet.length > 260 ? `${snippet.slice(0, 257).trimEnd()}...` : snippet
}

export type DayBucket = "today" | "yesterday" | "week" | "earlier"

function daysAgo(value: string | Date): number {
  const dayStart = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  return Math.round(
    (dayStart(new Date()) - dayStart(new Date(value))) / 86_400_000
  )
}

export function dayBucket(value: string | Date): DayBucket {
  const days = daysAgo(value)
  if (days <= 0) return "today"
  if (days === 1) return "yesterday"
  if (days < 7) return "week"
  return "earlier"
}

// the timestamp a row is ordered and labelled by: when an unreviewed post
// arrived, or when a published one last saw activity
export function itemStamp(item: InboxItem, view: InboxView): string | Date {
  return view === "review" ? item.createdAt : item.updatedAt
}

export function idleDays(item: InboxItem): number {
  return Math.max(daysAgo(item.updatedAt), 0)
}

// messaging-app timestamps: a clock time today, a weekday within the week,
// otherwise a short date
export function formatMessageTime(value: string | Date, locale: string): string {
  const date = new Date(value)
  const days = daysAgo(value)

  if (days <= 0) {
    return date.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })
  }
  if (days < 7) return date.toLocaleDateString(locale, { weekday: "short" })
  return date.toLocaleDateString(
    locale,
    date.getFullYear() === new Date().getFullYear()
      ? { month: "short", day: "numeric" }
      : { month: "short", day: "numeric", year: "numeric" }
  )
}
