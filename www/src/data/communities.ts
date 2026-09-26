import { m } from "@/paraglide/messages"
import {
  Airplane01Icon,
  Briefcase02Icon,
  Coffee02Icon,
  Home01Icon,
  Hospital01Icon,
  Target01Icon,
  UserGroup02Icon,
} from "@hugeicons/core-free-icons"

// the fixed topic spaces (spec 0010). Adding one is a code change and a
// deploy. This order is the tie order everywhere a list of communities is
// shown (AC-1). A thread stores its community slug in guide.category
export const COMMUNITY_SLUGS = [
  "gender-affirming-care",
  "moving-country",
  "housing",
  "work",
  "health",
  "family",
  "general",
] as const

export type CommunitySlug = (typeof COMMUNITY_SLUGS)[number]

export function isCommunitySlug(value: string): value is CommunitySlug {
  return (COMMUNITY_SLUGS as readonly string[]).includes(value)
}

// threads in these show the "personal experience, not medical advice"
// notice (AC-7)
const HEALTH_COMMUNITIES: readonly CommunitySlug[] = [
  "gender-affirming-care",
  "health",
]

export function isHealthCommunity(slug: string): boolean {
  return (HEALTH_COMMUNITIES as readonly string[]).includes(slug)
}

export const communityIcon: Record<CommunitySlug, typeof Target01Icon> = {
  "gender-affirming-care": Target01Icon,
  "moving-country": Airplane01Icon,
  housing: Home01Icon,
  work: Briefcase02Icon,
  health: Hospital01Icon,
  family: UserGroup02Icon,
  general: Coffee02Icon,
}

// a function, not a value, so the label follows the current locale
export function communityLabel(slug: CommunitySlug): string {
  switch (slug) {
    case "gender-affirming-care":
      return m["pages.communities.names.genderAffirmingCare"]()
    case "moving-country":
      return m["pages.communities.names.movingCountry"]()
    case "housing":
      return m["pages.communities.names.housing"]()
    case "work":
      return m["pages.communities.names.work"]()
    case "health":
      return m["pages.communities.names.health"]()
    case "family":
      return m["pages.communities.names.family"]()
    case "general":
      return m["pages.communities.names.general"]()
  }
}

export const THREAD_TYPES = [
  "question",
  "how-to",
  "dos-and-donts",
  "planning",
  "experience",
] as const

export type ThreadType = (typeof THREAD_TYPES)[number]

export function threadTypeLabel(type: ThreadType): string {
  switch (type) {
    case "question":
      return m["pages.communities.types.question"]()
    case "how-to":
      return m["pages.communities.types.howTo"]()
    case "dos-and-donts":
      return m["pages.communities.types.dosAndDonts"]()
    case "planning":
      return m["pages.communities.types.planning"]()
    case "experience":
      return m["pages.communities.types.experience"]()
  }
}
