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
      className="group flex flex-col gap-3 border-t border-border/60 py-5"
    >
      {guide.coverImageUrl && (
        <img
          src={guide.coverImageUrl}
          alt=""
          className="h-36 w-full rounded-2xl object-cover"
        />
      )}
      <div className="flex flex-col gap-2.5">
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
        {guide.seriesTitle && (
          <p className="text-xs text-muted-foreground">
            {guide.seriesOrder
              ? m["pages.guides.seriesPartOf"]({ title: guide.seriesTitle, order: guide.seriesOrder })
              : guide.seriesTitle}
          </p>
        )}
        <h3 className="underline-offset-4 group-hover:underline">{guide.title}</h3>
        <p>{guide.excerpt}</p>
        <div className="mt-1 flex items-center justify-between">
          <p>{guide.contributor} · {m["pages.guides.readTimeMinutes"]({ count: guide.readTime })}</p>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-foreground"
            nativeButton={false}
            render={<span />}
          >
            {m["pages.guides.readGuide"]()}
            <HugeiconsIcon icon={ChevronRightIcon} />
          </Button>
        </div>
      </div>
    </Link>
  )
}
