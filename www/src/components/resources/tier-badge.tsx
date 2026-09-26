import { m } from "@/paraglide/messages"
import { CheckmarkCircle01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Badge } from "@pherus/ui/badge"

// how a health entry was checked (spec 0006): a verified badge, or a DIY
// accepted badge, each said in words. Callers show the plain community
// text when there is no tier, so an untiered entry looks as it always did
export function TierBadge({ tier }: { tier: "verified" | "diy" }) {
  if (tier === "verified") {
    return (
      <Badge>
        <HugeiconsIcon icon={CheckmarkCircle01Icon} data-icon="inline-start" />
        {m["components.resourceCard.verified"]()}
      </Badge>
    )
  }
  return <Badge variant="secondary">{m["components.resourceCard.diy"]()}</Badge>
}
