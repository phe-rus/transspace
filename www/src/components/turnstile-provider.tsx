import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react"

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string
          execution?: "render" | "execute"
          appearance?: "always" | "execute" | "interaction-only"
          callback: (token: string) => void
          "expired-callback"?: () => void
          "error-callback"?: () => void
        }
      ) => string
      execute: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js"

// a module level singleton, not per component state: React's dev mode
// StrictMode runs an effect, its cleanup, then the effect again on
// every mount, to surface exactly this class of bug. A ref inside the
// component resets across that replay just like state does, so two
// script tags landed in <head> ("Turnstile already has been loaded")
// and render() fired twice into the same container ("already been
// rendered"). This promise is shared across every mount/remount of the
// whole app, so the script is fetched at most once no matter how many
// times the effect body runs.
let scriptLoadPromise: Promise<void> | null = null

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  if (scriptLoadPromise) return scriptLoadPromise
  scriptLoadPromise = new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`
    )
    if (existing) {
      existing.addEventListener("load", () => resolve())
      return
    }
    const script = document.createElement("script")
    script.src = SCRIPT_SRC
    script.async = true
    script.onload = () => resolve()
    document.head.appendChild(script)
  })
  return scriptLoadPromise
}

type GetToken = () => Promise<string>

// how long a write waits for Cloudflare's script before giving up
const READY_TIMEOUT_MS = 15 * 1000

const TurnstileContext = createContext<GetToken | null>(null)

// the invisible Turnstile widget, mounted only on the sign in page: login
// is the one place in the app that uses Turnstile (the engineer's rule,
// overriding spec 0002 AC-5). It runs in Cloudflare's "execute" mode with
// "interaction-only" appearance, so it stays invisible unless Cloudflare's
// own risk check wants an interactive challenge. Renders nothing, and
// useTurnstileToken() rejects, when VITE_TURNSTILE_SITE_KEY isn't set
export function TurnstileProvider({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | undefined>(undefined)
  const pendingRef = useRef<{
    resolve: (token: string) => void
    reject: (error: Error) => void
  } | null>(null)
  // resolves once the widget exists. A write asked for a token before that
  // (a Join tapped the moment a page opens) waits on it instead of failing
  const readyRef = useRef<{ promise: Promise<void>; resolve: () => void } | null>(null)
  if (!readyRef.current) {
    let resolve!: () => void
    const promise = new Promise<void>((done) => (resolve = done))
    readyRef.current = { promise, resolve }
  }

  useEffect(() => {
    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as
      | string
      | undefined
    if (!siteKey || !containerRef.current) return
    // StrictMode replays this effect (run, cleanup, run). A "render
    // started" flag that the replay bails on is wrong: the first run's
    // .then() is already cancelled by the simulated cleanup, so the
    // widget would never render and getToken() would stay "not ready".
    // Instead every run waits on the shared script promise, and only the
    // first .then() that is still live (and finds no widget yet) renders
    if (widgetIdRef.current) {
      readyRef.current?.resolve()
      return
    }

    let cancelled = false
    loadTurnstileScript().then(() => {
      if (cancelled || !window.turnstile || !containerRef.current) return
      if (widgetIdRef.current) return
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey!,
        execution: "execute",
        appearance: "interaction-only",
        callback: (token) => {
          pendingRef.current?.resolve(token)
          pendingRef.current = null
        },
        "expired-callback": () => {
          pendingRef.current?.reject(new Error("Turnstile challenge expired"))
          pendingRef.current = null
        },
        "error-callback": () => {
          pendingRef.current?.reject(new Error("Turnstile challenge failed"))
          pendingRef.current = null
        },
      })
      readyRef.current?.resolve()
    })

    // intentionally no widget teardown here: this provider lives for
    // the app's whole lifetime (mounted once in __root.tsx), and
    // removing the widget on StrictMode's simulated cleanup was exactly
    // what raced against the simulated remount above
    return () => {
      cancelled = true
    }
  }, [])

  const getToken = useCallback(async (): Promise<string> => {
    if (!import.meta.env.VITE_TURNSTILE_SITE_KEY) {
      throw new Error("Turnstile is not configured")
    }
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      await Promise.race([
        readyRef.current!.promise,
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error("Turnstile is not ready yet")),
            READY_TIMEOUT_MS
          )
        }),
      ])
    } finally {
      clearTimeout(timer)
    }
    return new Promise((resolve, reject) => {
      if (!widgetIdRef.current || !window.turnstile) {
        reject(new Error("Turnstile is not ready yet"))
        return
      }
      pendingRef.current = { resolve, reject }
      window.turnstile.execute(widgetIdRef.current)
    })
  }, [])

  return (
    <TurnstileContext.Provider value={getToken}>
      {children}
      <div ref={containerRef} className="fixed bottom-0 left-0 z-[60]" />
    </TurnstileContext.Provider>
  )
}

// the token getter. Called before the widget has loaded, it waits for it
// (up to READY_TIMEOUT_MS) rather than failing, so a write tapped right
// after a page opens still goes through. Rejects only outside the
// provider, with no site key, or when Cloudflare's script never loads
export function useTurnstileToken(): GetToken {
  const getToken = useContext(TurnstileContext)
  if (!getToken) {
    return () => Promise.reject(new Error("Turnstile is not ready yet"))
  }
  return getToken
}
