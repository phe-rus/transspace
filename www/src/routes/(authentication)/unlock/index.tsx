import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from '@pherus/ui/button'
import { Card, CardContent } from '@pherus/ui/card'
import { Input } from '@pherus/ui/input'
import { signatureSpring } from '@pherus/ui/lib/motion'
import { HugeiconsIcon } from '@hugeicons/react'
import { SquareLock02Icon } from '@hugeicons/core-free-icons'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/(authentication)/unlock/')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const [pin, setPin] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (submitting || !pin) return
    setSubmitting(true)
    setError(null)
    const response = await fetch('/api/app-lock/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    })
    if (response.status === 429) {
      setSubmitting(false)
      setError(m['pages.auth.unlock.cooldown']())
      return
    }
    if (!response.ok) {
      setSubmitting(false)
      setPin('')
      setError(m['pages.auth.unlock.invalid']())
      return
    }
    navigate({ to: '/' })
  }

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-muted">
          <HugeiconsIcon icon={SquareLock02Icon} className="size-6" />
        </span>
        <h6 className="text-muted-foreground">{m['pages.auth.unlock.eyebrow']()}</h6>
        <h1>{m['pages.auth.unlock.title']()}</h1>
        <p className="text-muted-foreground">{m['pages.auth.unlock.subtitle']()}</p>
      </div>

      <Card className="w-full rounded-3xl px-2 py-2">
        <CardContent className="px-4 py-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="pin" className="sr-only">
                {m['pages.auth.unlock.pinLabel']()}
              </label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                autoFocus
                value={pin}
                onChange={(event) =>
                  setPin(event.target.value.replace(/\D/g, '').slice(0, 12))
                }
                className="h-11 text-center text-lg tracking-[0.4em]"
                aria-invalid={Boolean(error)}
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={signatureSpring}
                  className="text-center text-destructive"
                  role="alert"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.div whileTap={{ scale: 0.98 }} transition={signatureSpring}>
              <Button
                type="submit"
                size="lg"
                className="w-full rounded-full"
                disabled={submitting || pin.length < 6}
              >
                {m['pages.auth.unlock.submit']()}
              </Button>
            </motion.div>

            <a
              href="/api/auth/login?reset=1"
              className="text-center text-muted-foreground underline-offset-4 hover:underline"
            >
              {m['pages.auth.unlock.forgot']()}
            </a>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
