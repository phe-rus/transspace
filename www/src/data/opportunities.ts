import {
  Briefcase02Icon,
  GraduationScrollIcon,
  HandHeartIcon,
  JobShareIcon,
  MentoringIcon,
} from "@hugeicons/core-free-icons"

export const OPPORTUNITY_CATEGORIES = ["job", "freelance", "scholarship", "mentorship", "volunteering"] as const

export type OpportunityCategory = (typeof OPPORTUNITY_CATEGORIES)[number]

export const opportunityCategoryLabel: Record<OpportunityCategory, string> = {
  job: "Job",
  freelance: "Freelance",
  scholarship: "Scholarship",
  mentorship: "Mentorship",
  volunteering: "Volunteering",
}

export const opportunityCategoryIcon: Record<OpportunityCategory, typeof Briefcase02Icon> = {
  job: Briefcase02Icon,
  freelance: JobShareIcon,
  scholarship: GraduationScrollIcon,
  mentorship: MentoringIcon,
  volunteering: HandHeartIcon,
}

export interface OpportunityListing {
  id: string
  title: string
  org: string
  category: OpportunityCategory
  country: string
  remote: boolean
  /** Human readable, e.g. "Rolling" or a date. Illustrative only. */
  deadline: string
  description: string
  verified: boolean
}

/**
 * Illustrative only, no backend exists yet. Mirrors scope.md Slice 6
 * (Opportunities: "needs a decision"), the existing "Jobs & careers" nav
 * destination.
 */
export const opportunities: OpportunityListing[] = [
  {
    id: "inclusive-frontend-dev",
    title: "Frontend Developer",
    org: "Kolibri Housing Cooperative",
    category: "job",
    country: "Germany",
    remote: true,
    deadline: "Rolling",
    description: "Fully remote role at a queer-run cooperative building tenant tools. Trans and nonbinary applicants encouraged.",
    verified: true,
  },
  {
    id: "peer-translation-freelance",
    title: "Peer translation & interpretation",
    org: "Community requests",
    category: "freelance",
    country: "Various",
    remote: true,
    deadline: "Ongoing",
    description: "Short paid gigs translating medical and legal documents for newly arrived community members.",
    verified: false,
  },
  {
    id: "rainbow-futures-scholarship",
    title: "Rainbow Futures Scholarship",
    org: "Regenbogen Foundation",
    category: "scholarship",
    country: "Germany",
    remote: false,
    deadline: "Nov 30, 2026",
    description: "Tuition support for trans and intersex students enrolled in vocational or university programs.",
    verified: true,
  },
  {
    id: "career-restart-mentorship",
    title: "Career restart mentorship circle",
    org: "Trans Career Collective",
    category: "mentorship",
    country: "Various",
    remote: true,
    deadline: "Rolling",
    description: "Paired mentorship for people re-entering the workforce after transition-related leave.",
    verified: true,
  },
  {
    id: "hotline-volunteer",
    title: "Peer support hotline volunteer",
    org: "Recht & Regenbogen",
    category: "volunteering",
    country: "Germany",
    remote: true,
    deadline: "Dec 15, 2026",
    description: "Weekly evening shifts staffing a confidential peer support line. Training provided.",
    verified: true,
  },
  {
    id: "junior-designer-role",
    title: "Junior Product Designer",
    org: "Pherus",
    category: "job",
    country: "Remote",
    remote: true,
    deadline: "Oct 20, 2026",
    description: "Entry level design role on a small team building community safety tools. Portfolio, not degree, required.",
    verified: false,
  },
]
