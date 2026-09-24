import { useEffect, useRef } from "react"

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string
          callback: (token: string) => void
          "expired-callback"?: () => void
        },
      ) => string
      remove: (widgetId: string) => void
    }
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js"

// spec 0002 AC-5: every write endpoint requires a Turnstile challenge.
// Renders nothing (no widget) when VITE_TURNSTILE_SITE_KEY isn't set,
// since that key still needs a real value in this environment (see
// spec 0002-identity-data-trust-foundation's Follow up); the calling
// form is expected to keep its submit action disabled until a token
// arrives.
export function TurnstileWidget({
  onToken,
}: {
  onToken: (token: string | null) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as
      | string
      | undefined
    if (!siteKey || !containerRef.current) return

    let widgetId: string | undefined

    function render() {
      if (!window.turnstile || !containerRef.current) return
      widgetId = window.turnstile.render(containerRef.current, {
        sitekey: siteKey!,
        callback: (token) => onToken(token),
        "expired-callback": () => onToken(null),
      })
    }

    if (window.turnstile) {
      render()
    } else {
      const script = document.createElement("script")
      script.src = SCRIPT_SRC
      script.async = true
      script.onload = render
      document.head.appendChild(script)
    }

    return () => {
      if (widgetId && window.turnstile) {
        window.turnstile.remove(widgetId)
      }
    }
  }, [onToken])

  return <div ref={containerRef} />
}
