import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent } from '@pherus/ui/card'
import { HugeiconsIcon } from '@hugeicons/react'
import { Settings01Icon } from '@hugeicons/core-free-icons'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/(public)/profile/account-settings/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <article className="container mx-auto flex w-full flex-col items-center gap-6 py-10 md:max-w-lg">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-muted">
          <HugeiconsIcon icon={Settings01Icon} className="size-6" />
        </span>
        <h6 className="text-muted-foreground">{m['pages.profile.accountSettingsTitle']()}</h6>
        <h1>{m['pages.profile.comingSoonTitle']()}</h1>
        <p className="text-muted-foreground">{m['pages.profile.comingSoonBody']()}</p>
      </div>

      <Card className="w-full rounded-3xl px-2 py-2">
        <CardContent className="flex flex-col items-center gap-3 px-4 py-8 text-center">
          <p className="text-muted-foreground">{m['pages.profile.accountSettingsSubtitle']()}</p>
          <Link to="/profile" className="text-primary underline-offset-4 hover:underline">
            {m['pages.profile.back']()}
          </Link>
        </CardContent>
      </Card>
    </article>
  )
}
