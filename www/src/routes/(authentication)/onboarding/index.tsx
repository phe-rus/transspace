import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from '@pherus/ui/button'
import { Card, CardContent } from '@pherus/ui/card'
import { Input } from '@pherus/ui/input'
import { Textarea } from '@pherus/ui/textarea'
import { Badge } from '@pherus/ui/badge'
import { signatureSpring } from '@pherus/ui/lib/motion'
import { HugeiconsIcon } from '@hugeicons/react'
import { Tick02Icon } from '@hugeicons/core-free-icons'
import { m } from '@/paraglide/messages'
import { AVATAR_SLUGS, TOPICS } from '@/domains/profile/types'

export const Route = createFileRoute('/(authentication)/onboarding/')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [avatarSlug, setAvatarSlug] = useState<string | null>(null)
  const [bio, setBio] = useState('')
  const [pronouns, setPronouns] = useState('')
  const [topics, setTopics] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = displayName.trim().length >= 2 && Boolean(avatarSlug)

  function toggleTopic(topic: string) {
    setTopics((current) =>
      current.includes(topic)
        ? current.filter((t) => t !== topic)
        : [...current, topic]
    )
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setError(null)
    const response = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: displayName.trim(),
        avatarSlug,
        bio: bio.trim() || undefined,
        pronouns: pronouns.trim() || undefined,
        topics,
      }),
    })
    if (!response.ok) {
      setSubmitting(false)
      setError(m['pages.auth.onboarding.genericError']())
      return
    }
    navigate({ to: '/' })
  }

  return (
    <div className="flex w-full max-w-lg flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h6 className="text-muted-foreground">{m['pages.auth.onboarding.eyebrow']()}</h6>
        <h1>{m['pages.auth.onboarding.title']()}</h1>
        <p className="text-muted-foreground">{m['pages.auth.onboarding.subtitle']()}</p>
      </div>

      <Card className="w-full rounded-3xl px-2 py-2">
        <CardContent className="px-4 py-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="displayName" className="font-medium">
                {m['pages.auth.onboarding.displayNameLabel']()}
              </label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder={m['pages.auth.onboarding.displayNamePlaceholder']()}
                minLength={2}
                maxLength={32}
                required
              />
              <p className="text-muted-foreground">{m['pages.auth.onboarding.displayNameError']()}</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="font-medium">{m['pages.auth.onboarding.avatarLabel']()}</span>
              <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label={m['pages.auth.onboarding.avatarLabel']()}>
                {AVATAR_SLUGS.map((slug) => (
                  <button
                    key={slug}
                    type="button"
                    role="radio"
                    aria-checked={avatarSlug === slug}
                    onClick={() => setAvatarSlug(slug)}
                    className="relative size-14 shrink-0 overflow-hidden rounded-full ring-2 ring-transparent transition-all outline-none focus-visible:ring-ring aria-checked:ring-primary"
                  >
                    <img src={`/avatar/${slug}.jpg`} alt="" className="size-full object-cover" />
                    {avatarSlug === slug && (
                      <span className="absolute inset-0 flex items-center justify-center bg-foreground/30">
                        <HugeiconsIcon icon={Tick02Icon} className="size-5 text-background" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="pronouns" className="font-medium">
                {m['pages.auth.onboarding.pronounsLabel']()}
              </label>
              <Input
                id="pronouns"
                value={pronouns}
                onChange={(event) => setPronouns(event.target.value)}
                placeholder={m['pages.auth.onboarding.pronounsPlaceholder']()}
                maxLength={32}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="bio" className="font-medium">
                {m['pages.auth.onboarding.bioLabel']()}
              </label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                placeholder={m['pages.auth.onboarding.bioPlaceholder']()}
                maxLength={500}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="font-medium">{m['pages.auth.onboarding.topicsLabel']()}</span>
              <p className="text-muted-foreground">{m['pages.auth.onboarding.topicsHint']()}</p>
              <div className="flex flex-wrap gap-1.5">
                {TOPICS.map((topic) => (
                  <Badge
                    key={topic}
                    variant={topics.includes(topic) ? 'default' : 'outline'}
                    render={
                      <button
                        type="button"
                        aria-pressed={topics.includes(topic)}
                        onClick={() => toggleTopic(topic)}
                      />
                    }
                    className="cursor-pointer px-3 py-2.5"
                  >
                    {topic.replace('-', ' ')}
                  </Badge>
                ))}
              </div>
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
            </AnimatePresence>

            <motion.div whileTap={{ scale: 0.98 }} transition={signatureSpring}>
              <Button
                type="submit"
                size="lg"
                className="w-full rounded-full"
                disabled={!canSubmit || submitting}
              >
                {m['pages.auth.onboarding.submit']()}
              </Button>
            </motion.div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
