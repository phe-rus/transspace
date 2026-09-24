import { createMiddleware } from "@tanstack/react-start"
import { getCurrentSession } from "./session"

// any signed-in person: self-service upload endpoints (spec 0002 AC-3)
// gate on this, not ModeratorMiddleware. Throws a plain Response rather
// than a router redirect(): thrown from inside server-function middleware
// (not a route loader/beforeLoad), a redirect() doesn't reliably reach the
// router's own handling and can surface as an uncaught error instead.
// Context also carries isDecoy so every private endpoint (profile,
// app-lock, account) can build on this one middleware rather than each
// re-deriving it (spec 0001 key invariants).
export const SessionMiddleware = createMiddleware().server(
    async ({ next }) => {
        const session = await getCurrentSession()
        if (!session) {
            throw new Response("Unauthorized", {
                status: 401,
            })
        }
        return next({ context: session })
    }
)
