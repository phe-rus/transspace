import { ChevronRightIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Link } from "@tanstack/react-router"

export interface ProfileSettingRowProps {
  icon: typeof ChevronRightIcon
  title: string
  subtitle: string
  // omitted: the row stays a disabled placeholder for a setting screen
  // that isn't built yet
  to?: string
}

export function ProfileSettingRow({ icon, title, subtitle, to }: ProfileSettingRowProps) {
  const className =
    "group flex items-center gap-3 border-t border-border/60 py-4 text-left disabled:opacity-100"
  const content = (
    <>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">
        <HugeiconsIcon icon={icon} className="size-4" />
      </span>
      <span className="flex flex-1 flex-col gap-0.5">
        <h4 className={to ? "underline-offset-4 group-hover:underline" : undefined}>{title}</h4>
        <p>{subtitle}</p>
      </span>
      <HugeiconsIcon icon={ChevronRightIcon} className="size-3.5 shrink-0 text-muted-foreground" />
    </>
  )

  if (to) {
    return (
      <Link to={to} className={className}>
        {content}
      </Link>
    )
  }

  return (
    <button type="button" disabled className={className}>
      {content}
    </button>
  )
}
