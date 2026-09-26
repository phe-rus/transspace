import {
  Airplane01Icon,
  Briefcase02Icon,
  Home01Icon,
  Hospital01Icon,
  Target01Icon,
  UserGroup02Icon,
} from "@hugeicons/core-free-icons"

// what a story is about (spec 0007). Stored in the guide table's category
// column, validated at the domain layer like guide categories
export const STORY_TOPICS = [
  "transition",
  "relocation",
  "housing",
  "employment",
  "health",
  "family",
  "community",
] as const

export type StoryTopic = (typeof STORY_TOPICS)[number]

export const storyTopicLabel: Record<StoryTopic, string> = {
  transition: "Transition",
  relocation: "Moving country",
  housing: "Housing",
  employment: "Work",
  health: "Health",
  family: "Family",
  community: "Community",
}

export const storyTopicIcon: Record<StoryTopic, typeof Target01Icon> = {
  transition: Target01Icon,
  relocation: Airplane01Icon,
  housing: Home01Icon,
  employment: Briefcase02Icon,
  health: Hospital01Icon,
  family: UserGroup02Icon,
  community: UserGroup02Icon,
}

// how a story shows its writer: the profile display name, or nothing at all
export const AUTHOR_VISIBILITIES = ["profile", "anonymous"] as const

export type AuthorVisibility = (typeof AUTHOR_VISIBILITIES)[number]
