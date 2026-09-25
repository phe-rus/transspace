import {
  Briefcase02Icon,
  Coins01Icon,
  Hospital01Icon,
  LegalDocument01Icon,
  PaintBoardIcon,
  Target01Icon,
  CodeCircleIcon,
} from "@hugeicons/core-free-icons"

export const GUIDE_CATEGORIES = [
  "health",
  "legal",
  "career",
  "life-skills",
  "technology",
  "finance",
  "creative",
] as const

export type GuideCategory = (typeof GUIDE_CATEGORIES)[number]

export const guideCategoryLabel: Record<GuideCategory, string> = {
  health: "Health",
  legal: "Legal",
  career: "Career",
  "life-skills": "Life skills",
  technology: "Technology",
  finance: "Money & finance",
  creative: "Creative",
}

export const guideCategoryIcon: Record<GuideCategory, typeof Hospital01Icon> = {
  health: Hospital01Icon,
  legal: LegalDocument01Icon,
  career: Briefcase02Icon,
  "life-skills": Target01Icon,
  technology: CodeCircleIcon,
  finance: Coins01Icon,
  creative: PaintBoardIcon,
}
