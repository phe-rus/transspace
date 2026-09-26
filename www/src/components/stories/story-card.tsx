import type { listGuides } from "@/domains/guides"
import { storyTopicIcon, storyTopicLabel, type StoryTopic } from "@/data/stories"
import { m } from "@/paraglide/messages"
import { HugeiconsIcon } from "@hugeicons/react"
import { Link } from "@tanstack/react-router"

export type StoryListItem = Awaited<
  ReturnType<typeof listGuides>
>["items"][number]

// one story in the list: topic, title, summary, and who wrote it (or that
// it was shared anonymously)
export function StoryCard({ story }: { story: StoryListItem }) {
  const topic = story.category as StoryTopic

  return (
    <Link
      to="/stories/$storyId/details"
      params={{ storyId: story.id }}
      className="group flex flex-col gap-2 border-t border-border/60 py-5"
    >
      <h6 className="flex items-center gap-1.5">
        <HugeiconsIcon icon={storyTopicIcon[topic]} className="size-3.5" />
        {storyTopicLabel[topic]}
      </h6>
      <h3 className="underline-offset-4 group-hover:underline">
        {story.title}
      </h3>
      <p>{story.excerpt}</p>
      <p className="mt-1 text-xs">
        {story.contributor ?? m["pages.stories.anonymous"]()} ·{" "}
        {m["pages.guides.readTimeMinutes"]({ count: story.readTime })}
      </p>
    </Link>
  )
}
