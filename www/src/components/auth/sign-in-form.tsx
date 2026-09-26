import { useTurnstileToken } from "@/components/turnstile-provider"
import { m } from "@/paraglide/messages"
import { Button } from "@pherus/ui/button"
import { useRef, useState } from "react"

// sign in, the one place Turnstile runs: get a token from the invisible
// widget, then POST it to /api/auth/login, which checks it before sending
// the person on to the identity provider. The token travels in the body,
// never the URL
export function SignInForm({ reset }: { reset: boolean }) {
  const formRef = useRef<HTMLFormElement>(null)
  const tokenRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const getTurnstileToken = useTurnstileToken()

  return (
    <form
      ref={formRef}
      method="post"
      action="/api/auth/login"
      onSubmit={async (event) => {
        event.preventDefault()
        setPending(true)
        setFailed(false)
        try {
          tokenRef.current!.value = await getTurnstileToken()
          formRef.current!.submit()
        } catch {
          setPending(false)
          setFailed(true)
        }
      }}
      className="flex flex-col gap-2"
    >
      <input ref={tokenRef} type="hidden" name="turnstileToken" />
      {reset && <input type="hidden" name="reset" value="1" />}
      <Button type="submit" size="lg" disabled={pending} className="w-full rounded-full">
        {m["pages.auth.signIn.cta"]()}
      </Button>
      {failed && (
        <p role="alert" className="text-center text-sm text-destructive">
          {m["pages.auth.signIn.checkFailed"]()}
        </p>
      )}
    </form>
  )
}
