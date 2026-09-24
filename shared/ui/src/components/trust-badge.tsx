import { AlertTriangle, CheckCircle2, Link2, ShieldCheck } from "lucide-react"
import { Badge } from "./badge"
import { cn } from "cn"

// the public, whitelisted trust_signal shape a GET /trust-signals/:type/:id
// response returns (spec 0003 AC-6): no internal ids, booleans/counts/
// timestamps only
export type TrustSignalState = {
  communityReviewed: boolean
  coSignCount: number
  referencesAvailable: boolean
  professionalVerified: boolean
  disputed: boolean
}

// color is never the only signal (shared/ui/AGENTS.md accessibility
// floor): every state below pairs its color with an icon and text, never
// color alone. Inherits the existing badge shape rather than inventing a
// new visual language, per spec 0003's Follow up.
function TrustBadge({
  signal,
  className,
}: {
  signal: TrustSignalState
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5",
        className
      )}
    >
      {signal.disputed && (
        <Badge variant="destructive">
          <AlertTriangle />
          Disputed
        </Badge>
      )}
      {!signal.disputed && signal.communityReviewed && (
        <Badge variant="secondary">
          <CheckCircle2 />
          Community reviewed ({signal.coSignCount})
        </Badge>
      )}
      {signal.professionalVerified && (
        <Badge variant="default">
          <ShieldCheck />
          Verified professional
        </Badge>
      )}
      {signal.referencesAvailable && (
        <Badge variant="outline">
          <Link2 />
          References available
        </Badge>
      )}
    </div>
  )
}

export { TrustBadge }
