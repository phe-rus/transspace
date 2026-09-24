import { createFileRoute } from "@tanstack/react-router"
import { signOutSession } from "@/domains/auth"
import { toHttpResponse } from "@/lib/http"

// spec 0001 AC-4: `everywhere` revokes every session tied to this
// person's user_link, not just the current one
export const Route = createFileRoute("/api/auth/logout")({
    server: {
        handlers: {
            POST: ({ request }) =>
                toHttpResponse(async () =>
                    signOutSession({ data: await request.json() })
                ),
        },
    },
})
