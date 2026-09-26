import {
  Airplane01Icon,
  Alert01Icon,
  Hospital01Icon,
  Home01Icon,
  LegalDocument01Icon,
  UserGroup02Icon,
} from "@hugeicons/core-free-icons"

/**
 * Shared category vocabulary for placeholder resource data, and the color
 * each one renders as on the map and in any resource list. Colors match
 * the hex already behind this app's existing semantic tokens (--info,
 * --warning, --success, --destructive in shared/ui/src/styles/globals.css)
 * rather than inventing a separate palette, since MapLibre paint
 * properties need literal color strings and can't read a CSS var().
 */
export const RESOURCE_CATEGORIES = ["health", "legal", "housing", "community", "crisis", "travel"] as const

export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number]

// how a health entry was checked (spec 0006): verified by a moderator, or
// DIY accepted (self provided or community run care with a clear label).
// Only the health category carries a tier
export const RESOURCE_TIERS = ["verified", "diy"] as const

export type ResourceTier = (typeof RESOURCE_TIERS)[number]

export const resourceCategoryColor: Record<ResourceCategory, string> = {
  health: "#3b82f6", // matches --info (--color-blue-500)
  legal: "#f59e0b", // matches --warning (--color-amber-500)
  housing: "#10b981", // matches --success (--color-emerald-500)
  community: "#D4736E", // matches the existing hero/accent token exception
  crisis: "#ef4444", // close to --destructive
  travel: "#8b5cf6", // matches --color-violet-500
}

export const resourceCategoryLabel: Record<ResourceCategory, string> = {
  health: "Health",
  legal: "Legal aid",
  housing: "Housing & safe spaces",
  community: "Community",
  crisis: "Crisis support",
  travel: "Travel & mobility",
}

export const resourceCategoryIcon: Record<ResourceCategory, typeof Hospital01Icon> = {
  health: Hospital01Icon,
  legal: LegalDocument01Icon,
  housing: Home01Icon,
  community: UserGroup02Icon,
  crisis: Alert01Icon,
  travel: Airplane01Icon,
}

/**
 * Finer-grained slugs within a category, used for the header mega-menu's
 * deep links. Routes for these live flat under `/r/` (e.g. `/r/mental-health`,
 * not `/r/health/mental-health`) — `www/src/routes/(public)/r/` has no
 * per-category subfolders. `legal`, `crisis`, and `travel` have none: each
 * is a single page filtered on category alone.
 */
export const RESOURCE_SUBCATEGORIES_BY_CATEGORY = {
  health: ["healthcare-providers", "gender-affirmation-health", "mental-health", "general-health"],
  housing: ["safe-space"],
  legal: [],
  community: ["support"],
  crisis: [],
  travel: [],
} as const satisfies Record<ResourceCategory, readonly string[]>

export type ResourceSubcategory =
  (typeof RESOURCE_SUBCATEGORIES_BY_CATEGORY)[ResourceCategory][number]

export interface ResourceProperties {
  id: string
  name: string
  category: ResourceCategory
  /** Absent for `crisis`, which has no subcategories — nothing in the nav links there. */
  subcategory?: ResourceSubcategory
  country: string
  /** A short, human-readable cost/wait placeholder, e.g. "Free · same day". */
  estimate: string
  verified: boolean
  /** Illustrative only. How the community says this place is best reached. */
  contact?: string
  /** Whether this listing says it takes people from outside its own country. */
  internationalAccess?: boolean
}
