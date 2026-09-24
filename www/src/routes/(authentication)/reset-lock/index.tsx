import { createFileRoute, redirect } from '@tanstack/react-router'
import { resetAppLock } from '@/domains/app-lock'
import { m } from '@/paraglide/messages'

// lands here right after a forced Infra re-sign in (see /api/auth/login
// ?reset=1). Clears the app lock PIN, then bounces on to /security so a
// new one can be set, or back to /auth if the freshness proof failed
export const Route = createFileRoute('/(authentication)/reset-lock/')({
  beforeLoad: async () => {
    let ok = true
    try {
      await resetAppLock()
    } catch {
      ok = false
    }
    throw redirect({ to: ok ? '/security' : '/auth' })
  },
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <h6 className="text-muted-foreground">{m['pages.auth.resetLock.title']()}</h6>
      <p className="text-muted-foreground">{m['pages.auth.resetLock.subtitle']()}</p>
    </div>
  )
}
