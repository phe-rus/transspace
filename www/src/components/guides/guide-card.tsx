import { guideCategoryIcon, guideCategoryLabel, type GuideEntry } from "@/data/guides"
import { CheckmarkCircle01Icon, ChevronRightIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@pherus/ui/button"

export interface GuideCardProps {
  guide: GuideEntry
}

export function GuideCard({ guide }: GuideCardProps) {
  return (
    <article className="flex flex-col gap-2.5 rounded-3xl border border-border bg-card p-5 transition-colors hover:bg-muted">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h6 className="flex items-center gap-1.5">
          <HugeiconsIcon icon={guideCategoryIcon[guide.category]} className="size-3.5" />
          {guideCategoryLabel[guide.category]}
        </h6>
        {guide.verified && (
          <h6 className="flex items-center gap-1 text-success">
            <HugeiconsIcon icon={CheckmarkCircle01Icon} className="size-3" />
            Community reviewed
          </h6>
        )}
      </div>
      <h3>{guide.title}</h3>
      <p>{guide.excerpt}</p>
      <div className="mt-1 flex items-center justify-between">
        <p>{guide.contributor} · {guide.readTime}</p>
        <Button variant="ghost" size="sm" disabled className="gap-1 text-foreground">
          Read guide
          <HugeiconsIcon icon={ChevronRightIcon} />
        </Button>
      </div>
    </article>
  )
}
