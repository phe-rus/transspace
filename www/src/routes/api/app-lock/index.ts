import { createFileRoute } from "@tanstack/react-router"
import { setAppLock } from "@/domains/app-lock"
import { toHttpResponse } from "@/lib/http"

export const Route = createFileRoute("/api/app-lock/")({
    server: {
        handlers: {
            POST: ({ request }) =>
                toHttpResponse(async () =>
                    setAppLock({ data: await request.json() })
                ),
        },
    },
})
