import { createFileRoute } from "@tanstack/react-router"
import { loginRedirectUrl } from "@/domains/auth"

// GET, no auth: the entry point (spec 0001 API surface). A bare link, no
// client JS required: everything happens via server side redirects.
export const Route = createFileRoute("/api/auth/login")({
    server: {
        handlers: {
            GET: async ({ request }) => {
                const forceReauth = new URL(request.url).searchParams.get("reset") === "1"
                const url = await loginRedirectUrl(request.headers, {
                    forceReauth,
                })
                // not Response.redirect(): the Fetch spec gives that
                // constructor's Response immutable headers, and Better
                // Auth's cookie plugin needs to attach the PKCE/state
                // Set-Cookie header onto this same response
                return new Response(null, {
                    status: 302,
                    headers: {
                        Location: url
                    },
                })
            },
        },
    },
})
