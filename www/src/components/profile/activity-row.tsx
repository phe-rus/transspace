import { cn } from "@pherus/ui/lib/utils"

export interface ProfileActivityRowProps {
  label: string
  meta: string
  metaClassName?: string
}

export function ProfileActivityRow({ label, meta, metaClassName }: ProfileActivityRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-b-0">
      <p className="text-foreground">{label}</p>
      <p className={cn("shrink-0", metaClassName)}>{meta}</p>
    </div>
  )
}
