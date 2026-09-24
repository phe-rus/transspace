import { createFileRoute } from "@tanstack/react-router"
import { verifyAppLock } from "@/domains/app-lock"
import { toHttpResponse } from "@/lib/http"

export const Route = createFileRoute("/api/app-lock/verify")({
    server: {
        handlers: {
            POST: ({ request }) =>
                toHttpResponse(async () =>
                    verifyAppLock({ data: await request.json() })
                ),
        },
    },
})
