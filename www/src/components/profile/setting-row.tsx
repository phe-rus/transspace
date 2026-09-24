import { ChevronRightIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

export interface ProfileSettingRowProps {
  icon: typeof ChevronRightIcon
  title: string
  subtitle: string
}

export function ProfileSettingRow({ icon, title, subtitle }: ProfileSettingRowProps) {
  return (
    <button
      type="button"
      disabled
      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors enabled:hover:border-foreground/20 disabled:opacity-100"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">
        <HugeiconsIcon icon={icon} className="size-4" />
      </span>
      <span className="flex flex-1 flex-col gap-0.5">
        <h4>{title}</h4>
        <p>{subtitle}</p>
      </span>
      <HugeiconsIcon icon={ChevronRightIcon} className="size-3.5 shrink-0 text-muted-foreground" />
    </button>
  )
}
