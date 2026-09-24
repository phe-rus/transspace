import {
  Book01Icon,
  Briefcase02Icon,
  Hospital01Icon,
  LegalDocument01Icon,
  Target01Icon,
} from "@hugeicons/core-free-icons"

export const GUIDE_CATEGORIES = ["health", "legal", "career", "life-skills"] as const

export type GuideCategory = (typeof GUIDE_CATEGORIES)[number]

export const guideCategoryLabel: Record<GuideCategory, string> = {
  health: "Health",
  legal: "Legal",
  career: "Career",
  "life-skills": "Life skills",
}

export const guideCategoryIcon: Record<GuideCategory, typeof Book01Icon> = {
  health: Hospital01Icon,
  legal: LegalDocument01Icon,
  career: Briefcase02Icon,
  "life-skills": Target01Icon,
}

export interface GuideEntry {
  id: string
  title: string
  excerpt: string
  category: GuideCategory
  contributor: string
  readTime: string
  verified: boolean
}

/**
 * Illustrative only, no backend exists yet. Mirrors scope.md Slice 4
 * (Guides: "needs a decision"), the existing "Skills & learning" nav
 * destination ("Learn new skills").
 */
export const guides: GuideEntry[] = [
  {
    id: "healthcare-uganda",
    title: "Finding healthcare in Uganda",
    excerpt: "A step by step walkthrough of locating gender-affirming providers when public directories won't say it outright.",
    category: "health",
    contributor: "Jordan K.",
    readTime: "6 min read",
    verified: true,
  },
  {
    id: "gender-affirming-care-basics",
    title: "Understanding gender-affirming care",
    excerpt: "What to expect from a first consultation, the vocabulary clinics use, and questions worth asking upfront.",
    category: "health",
    contributor: "Dr. Alex M.",
    readTime: "9 min read",
    verified: true,
  },
  {
    id: "name-change-checklist",
    title: "Legal name change, country by country",
    excerpt: "A living checklist of documents, fees, and waiting periods across the countries the community has navigated.",
    category: "legal",
    contributor: "Recht & Regenbogen",
    readTime: "12 min read",
    verified: true,
  },
  {
    id: "disclosure-at-work",
    title: "Deciding when to come out at work",
    excerpt: "No universal answer, but a framework for weighing safety, legal protection, and what you actually owe an employer.",
    category: "career",
    contributor: "Sam R.",
    readTime: "7 min read",
    verified: false,
  },
  {
    id: "rebuilding-a-resume",
    title: "Rebuilding a resume after a gap",
    excerpt: "How to frame a gap from transition, relocation, or recovery without over-explaining it.",
    category: "career",
    contributor: "Trans Career Collective",
    readTime: "5 min read",
    verified: true,
  },
  {
    id: "budgeting-on-a-tight-income",
    title: "Budgeting for hormone therapy on a tight income",
    excerpt: "Sliding scale clinics, pharmacy discount programs, and what to ask a provider about payment plans.",
    category: "life-skills",
    contributor: "Riley W.",
    readTime: "8 min read",
    verified: false,
  },
]
