import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@pherus/ui/button'
import { Card, CardContent } from '@pherus/ui/card'
import { HugeiconsIcon } from '@hugeicons/react'
import { ShieldKeyIcon, UserSwitchIcon } from '@hugeicons/core-free-icons'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/(authentication)/auth/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <HugeiconsIcon icon={ShieldKeyIcon} className="size-6" />
        </span>
        <h6 className="text-muted-foreground">{m['pages.auth.signIn.eyebrow']()}</h6>
        <h1>{m['pages.auth.signIn.title']()}</h1>
        <p className="text-muted-foreground">{m['pages.auth.signIn.subtitle']()}</p>
      </div>

      <Card className="w-full rounded-3xl px-2 py-2">
        <CardContent className="flex flex-col gap-3 px-4 py-4">
          <Button
            size="lg"
            className="w-full rounded-full"
            nativeButton={false}
            render={<a href="/api/auth/login" />}
          >
            {m['pages.auth.signIn.cta']()}
          </Button>
          <div className="flex items-start gap-2 rounded-2xl bg-muted px-3 py-2.5 text-left">
            <HugeiconsIcon
              icon={UserSwitchIcon}
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <p className="text-muted-foreground">{m['pages.auth.signIn.privacyNote']()}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
