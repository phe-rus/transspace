import { amIAdminQueryOptions } from "@/domains/admins"
import { m } from "@/paraglide/messages"
import { ArrowLeft01Icon, ShieldKeyIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Badge } from "@pherus/ui/badge"
import { Link } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"

// the admin area's own header, distinct from the public site header
// (components/headers/headers.tsx), which (protection)/route.tsx never
// mounts. Dense posture, no motion, a console chrome rather than a
// marketing nav (engineer's explicit call, 2026-09-25)
export function AdminHeader() {
  const { data: me } = useSuspenseQuery(amIAdminQueryOptions())

  return (
    <header className="sticky top-0 z-35 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto flex h-12 w-full items-center justify-between md:max-w-5xl">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3.5" />
            {m["navigation.title"]()}
          </Link>
          <span className="h-4 w-px bg-border" />
          <Link to="/admin" className="flex items-center gap-1.5">
            <HugeiconsIcon icon={ShieldKeyIcon} className="size-4" />
            <strong className="text-sm text-foreground">
              {m["pages.admin.consoleTitle"]()}
            </strong>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {me.isFounder ? (
            <Badge variant="default">{m["pages.admin.founderBadge"]()}</Badge>
          ) : me.isSuperAdmin ? (
            <Badge variant="secondary">{m["pages.admin.superAdminBadge"]()}</Badge>
          ) : (
            <Badge variant="outline">{m["pages.admin.adminBadge"]()}</Badge>
          )}
          <Link to="/profile" className="text-sm text-muted-foreground hover:text-foreground">
            {m["pages.admin.backToProfile"]()}
          </Link>
        </div>
      </div>
    </header>
  )
}
