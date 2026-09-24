import { createFileRoute } from "@tanstack/react-router"
import { grantModerator } from "@/domains/moderators"
import { toHttpResponse } from "@/lib/http"

export const Route = createFileRoute("/api/moderators")({
    server: {
        handlers: {
            POST: ({ request }) =>
                toHttpResponse(async () =>
                    grantModerator({
                        data: await request.json(),
                    })
                ),
        },
    },
})
