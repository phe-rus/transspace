import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from '@pherus/ui/button'
import { Card, CardContent } from '@pherus/ui/card'
import { Input } from '@pherus/ui/input'
import { signatureSpring } from '@pherus/ui/lib/motion'
import { HugeiconsIcon } from '@hugeicons/react'
import { SquareLock02Icon, Tick02Icon } from '@hugeicons/core-free-icons'
import { m } from '@/paraglide/messages'
import { getAppLockStatus } from '@/domains/app-lock'

// gated by the parent /profile route's beforeLoad (signed in, onboarded,
// unlocked), so no separate guard needed here
export const Route = createFileRoute('/(public)/profile/security/')({
  loader: () => getAppLockStatus(),
  component: RouteComponent,
})

function RouteComponent() {
  const status = Route.useLoaderData()
  const router = useRouter()
  const [hasPinSet, setHasPinSet] = useState(status.hasPinSet)
  const [hasDuressPinSet, setHasDuressPinSet] = useState(
    status.hasDuressPinSet
  )
  const [currentPin, setCurrentPin] = useState('')
  const [pin, setPin] = useState('')
  const [duressPin, setDuressPin] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError(null)
    setSaved(false)
    const response = await fetch('/api/app-lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPin: hasPinSet ? currentPin : undefined,
        pin: pin || undefined,
        duressPin: duressPin || undefined,
      }),
    })
    setSubmitting(false)
    if (!response.ok) {
      setError(await response.text())
      return
    }
    if (pin) setHasPinSet(true)
    if (duressPin) setHasDuressPinSet(true)
    setCurrentPin('')
    setPin('')
    setDuressPin('')
    setSaved(true)
    router.invalidate()
  }

  async function handleClearDuress() {
    setSubmitting(true)
    setError(null)
    const response = await fetch('/api/app-lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPin: currentPin || undefined,
        clearDuress: true,
      }),
    })
    setSubmitting(false)
    if (!response.ok) {
      setError(await response.text())
      return
    }
    setHasDuressPinSet(false)
    setSaved(true)
    router.invalidate()
  }

  return (
    <article className="container mx-auto flex w-full flex-col items-center gap-6 py-10 md:max-w-lg">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-muted">
          <HugeiconsIcon icon={SquareLock02Icon} className="size-6" />
        </span>
        <h6 className="text-muted-foreground">{m['pages.auth.security.eyebrow']()}</h6>
        <h1>{m['pages.auth.security.title']()}</h1>
        <p className="text-muted-foreground">{m['pages.auth.security.subtitle']()}</p>
      </div>

      <Card className="w-full rounded-3xl px-2 py-2">
        <CardContent className="px-4 py-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {hasPinSet && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="currentPin" className="font-medium">
                  {m['pages.auth.security.currentPinLabel']()}
                </label>
                <Input
                  id="currentPin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  value={currentPin}
                  onChange={(event) =>
                    setCurrentPin(
                      event.target.value.replace(/\D/g, '').slice(0, 12)
                    )
                  }
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="pin" className="font-medium">
                {m['pages.auth.security.pinLabel']()}
              </label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={pin}
                onChange={(event) =>
                  setPin(event.target.value.replace(/\D/g, '').slice(0, 12))
                }
              />
              <p className="text-muted-foreground">{m['pages.auth.security.pinHint']()}</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="duressPin" className="font-medium">
                {m['pages.auth.security.duressPinLabel']()}
              </label>
              <Input
                id="duressPin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={duressPin}
                onChange={(event) =>
                  setDuressPin(
                    event.target.value.replace(/\D/g, '').slice(0, 12)
                  )
                }
              />
              <p className="text-muted-foreground">{m['pages.auth.security.duressPinHint']()}</p>
              {hasDuressPinSet && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-fit text-destructive"
                  disabled={submitting}
                  onClick={handleClearDuress}
                >
                  {m['pages.auth.security.clearDuress']()}
                </Button>
              )}
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={signatureSpring}
                  className="text-destructive"
                  role="alert"
                >
                  {error}
                </motion.p>
              )}
              {saved && !error && (
                <motion.p
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={signatureSpring}
                  className="flex items-center gap-1.5 text-success"
                  role="status"
                >
                  <HugeiconsIcon icon={Tick02Icon} className="size-4" />
                  {m['pages.auth.security.saved']()}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.div whileTap={{ scale: 0.98 }} transition={signatureSpring}>
              <Button
                type="submit"
                size="lg"
                className="w-full rounded-full"
                disabled={submitting || (!pin && !duressPin)}
              >
                {m['pages.auth.security.save']()}
              </Button>
            </motion.div>

            {hasPinSet && (
              <a
                href="/api/auth/login?reset=1"
                className="text-center text-muted-foreground underline-offset-4 hover:underline"
              >
                {m['pages.auth.security.forgotPin']()}
              </a>
            )}
          </form>
        </CardContent>
      </Card>
    </article>
  )
}
