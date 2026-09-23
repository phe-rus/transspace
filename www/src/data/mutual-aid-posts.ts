export const MUTUAL_AID_CATEGORIES = ["urgent", "info", "general", "food", "offer"] as const

export type MutualAidCategory = (typeof MUTUAL_AID_CATEGORIES)[number]

export interface MutualAidPost {
  id: string
  category: MutualAidCategory
  categoryLabel: string
  title: string
  description: string
  posterName: string
  postedAt: string
  /** Only meaningful for `category: "offer"`, which renders as a wide, standing listing. */
  recurring?: boolean
}

/**
 * Illustrative only, no backend or real submission data exists yet.
 * "Community support & mutual aid" is listed in docs/scope/scope.md as a
 * feature that still needs a decision; this page is that exploratory
 * concept, not part of the current build.
 */
export const mutualAidPosts: MutualAidPost[] = [
  {
    id: "medication-pickup",
    category: "urgent",
    categoryLabel: "Urgent",
    title: "Medication pickup",
    description:
      "Need someone to collect a prescription from the east side pharmacy, currently unable to leave the house.",
    posterName: "Sam R.",
    postedAt: "2h ago",
  },
  {
    id: "tenant-rights",
    category: "info",
    categoryLabel: "Info / advice",
    title: "Tenant rights question",
    description: "Looking for a community friendly advisor on queer inclusive housing rights.",
    posterName: "Alex M.",
    postedAt: "5h ago",
  },
  {
    id: "peer-support",
    category: "offer",
    categoryLabel: "Support offered · recurring",
    title: "Listening ear & peer support",
    description:
      "Offering a non judgmental space for anyone who needs to talk, weekly text or voice check ins.",
    posterName: "Jordan K.",
    postedAt: "1d ago",
    recurring: true,
  },
  {
    id: "dog-walking",
    category: "general",
    categoryLabel: "General",
    title: "Dog walking help",
    description: "Recovering from surgery, need short afternoon walks for the next week.",
    posterName: "Riley W.",
    postedAt: "1d ago",
  },
  {
    id: "home-cooked-meals",
    category: "food",
    categoryLabel: "Food security",
    title: "Extra home cooked meals",
    description: "Four portions of vegan lasagna available for anyone struggling this week.",
    posterName: "Casey L.",
    postedAt: "3h ago",
  },
]
