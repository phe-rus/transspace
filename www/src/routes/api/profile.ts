import { createFileRoute } from "@tanstack/react-router"
import { getProfile, updateProfile } from "@/domains/profile"
import { toHttpResponse } from "@/lib/http"

export const Route = createFileRoute("/api/profile")({
    server: {
        handlers: {
            GET: () => toHttpResponse(() => getProfile()),
            PATCH: ({ request }) =>
                toHttpResponse(async () =>
                    updateProfile({ data: await request.json() })
                ),
        },
    },
})
