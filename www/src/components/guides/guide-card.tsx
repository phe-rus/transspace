import type { listGuides } from "@/domains/guides"
import { guideCategoryIcon, guideCategoryLabel, type GuideCategory } from "@/data/guides"
import { m } from "@/paraglide/messages"
import { CheckmarkCircle01Icon, ChevronRightIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@pherus/ui/button"
import { Link } from "@tanstack/react-router"

export type GuideListItem = Awaited<
  ReturnType<typeof listGuides>
>["items"][number]

export interface GuideCardProps {
  guide: GuideListItem
}

export function GuideCard({ guide }: GuideCardProps) {
  // category is validated against GUIDE_CATEGORIES at submission time
  // (spec 0004 AC-7); the DB column itself is plain text, so this cast
  // just recovers the narrow type the icon/label maps need
  const category = guide.category as GuideCategory

  return (
    <Link
      to="/guides/$guideId/details"
      params={{ guideId: guide.id }}
      className="flex flex-col gap-2.5 rounded-3xl border border-border bg-card p-5 transition-colors hover:bg-muted"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h6 className="flex items-center gap-1.5">
          <HugeiconsIcon icon={guideCategoryIcon[category]} className="size-3.5" />
          {guideCategoryLabel[category]}
        </h6>
        {guide.communityReviewed && (
          <h6 className="flex items-center gap-1 text-success">
            <HugeiconsIcon icon={CheckmarkCircle01Icon} className="size-3" />
            {m["pages.guides.communityReviewed"]()}
          </h6>
        )}
      </div>
      <h3>{guide.title}</h3>
      <p>{guide.excerpt}</p>
      <div className="mt-1 flex items-center justify-between">
        <p>{guide.contributor} · {m["pages.guides.readTimeMinutes"]({ count: guide.readTime })}</p>
        <Button variant="ghost" size="sm" className="gap-1 text-foreground" nativeButton={false}>
          {m["pages.guides.readGuide"]()}
          <HugeiconsIcon icon={ChevronRightIcon} />
        </Button>
      </div>
    </Link>
  )
}
