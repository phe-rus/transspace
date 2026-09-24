import { createFileRoute } from "@tanstack/react-router"
import { auth } from "@/lib/auth"

// mounts every Better Auth core route (sign-in/social, the OAuth
// callback, sign-out, revoke-session(s), etc.) at /api/auth/*.
// Transspace's own /api/auth-login, /api/auth-logout etc. are thin
// wrappers around these, not a reimplementation (spec 0001 Build plan
// step 2)
export const Route = createFileRoute("/api/auth/$")({
    server: {
        handlers: {
            GET: ({ request }) => auth.handler(request),
            POST: ({ request }) => auth.handler(request),
        },
    },
})
