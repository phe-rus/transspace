import {
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
export const RESOURCE_CATEGORIES = ["health", "legal", "housing", "community", "crisis"] as const

export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number]

export const resourceCategoryColor: Record<ResourceCategory, string> = {
  health: "#3b82f6", // matches --info (--color-blue-500)
  legal: "#f59e0b", // matches --warning (--color-amber-500)
  housing: "#10b981", // matches --success (--color-emerald-500)
  community: "#D4736E", // matches the existing hero/accent token exception
  crisis: "#ef4444", // close to --destructive
}

export const resourceCategoryLabel: Record<ResourceCategory, string> = {
  health: "Health",
  legal: "Legal aid",
  housing: "Housing & safe spaces",
  community: "Community",
  crisis: "Crisis support",
}

export const resourceCategoryIcon: Record<ResourceCategory, typeof Hospital01Icon> = {
  health: Hospital01Icon,
  legal: LegalDocument01Icon,
  housing: Home01Icon,
  community: UserGroup02Icon,
  crisis: Alert01Icon,
}

/**
 * Finer-grained slugs within a category, used for the header mega-menu's
 * deep links (e.g. /r/health/providers). Each category has at least one;
 * `crisis` has none since nothing in the nav links there yet.
 */
export const RESOURCE_SUBCATEGORIES_BY_CATEGORY = {
  health: ["providers", "mental-and-hiv"],
  housing: ["safe-spaces"],
  legal: ["immigration"],
  community: ["support"],
  crisis: [],
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
