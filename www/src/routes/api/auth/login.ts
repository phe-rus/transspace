import { createFileRoute } from "@tanstack/react-router"
import { loginRedirectUrl } from "@/domains/auth"
import { assertTurnstileVerified } from "@/lib/turnstile"

// the entry point (spec 0001 API surface), and the one place in the app
// that uses Turnstile (the engineer's rule: login only). The sign in page
// POSTs its token here; only a verified POST is sent on to the identity
// provider. A GET (an old bookmark, or the "sign in again" links for a
// forgotten PIN) goes to the sign in page, keeping its reset flag
export const Route = createFileRoute("/api/auth/login")({
    server: {
        handlers: {
            GET: ({ request }) => {
                const reset =
                    new URL(request.url).searchParams.get("reset") === "1"
                return new Response(null, {
                    status: 303,
                    headers: { Location: reset ? "/auth?reset=1" : "/auth" },
                })
            },
            POST: async ({ request }) => {
                const form = await request.formData().catch(() => null)
                const token = form?.get("turnstileToken")
                const forceReauth = form?.get("reset") === "1"
                try {
                    await assertTurnstileVerified(
                        typeof token === "string" ? token : undefined,
                        request.headers.get("cf-connecting-ip") ?? undefined
                    )
                } catch (error) {
                    if (!(error instanceof Response)) throw error
                    // back to the sign in page with a short message, not a
                    // bare 403
                    return new Response(null, {
                        status: 303,
                        headers: {
                            Location: forceReauth
                                ? "/auth?reset=1&failed=1"
                                : "/auth?failed=1",
                        },
                    })
                }

                let url: string
                try {
                    url = await loginRedirectUrl(request.headers, {
                        forceReauth,
                    })
                } catch (error) {
                    if (error instanceof Response) return error
                    throw error
                }
                // not Response.redirect(): the Fetch spec gives that
                // constructor's Response immutable headers, and Better
                // Auth's cookie plugin needs to attach the PKCE/state
                // Set-Cookie header onto this same response. 303 so the
                // browser follows with a GET
                return new Response(null, {
                    status: 303,
                    headers: {
                        Location: url,
                    },
                })
            },
        },
    },
})
