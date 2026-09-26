import { GiftIcon, HelpCircleIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Avatar, AvatarFallback } from "@pherus/ui/avatar"
import { cn } from "@pherus/ui/lib/utils"
import { isOffer } from "./inbox-item"

// direction at a glance: an offer shows a gift, a request shows a question.
// Urgent tints the fallback, and is also said in words wherever it is used
export function InboxAvatar({
  type,
  urgent,
  size = "lg",
}: {
  type: string
  urgent: boolean
  size?: "default" | "sm" | "lg"
}) {
  return (
    <Avatar size={size} className="after:border-border/35">
      <AvatarFallback
        className={cn(urgent && "bg-destructive/10 text-destructive")}
      >
        <HugeiconsIcon
          icon={isOffer(type) ? GiftIcon : HelpCircleIcon}
          size={size === "lg" ? 18 : 14}
        />
      </AvatarFallback>
    </Avatar>
  )
}
