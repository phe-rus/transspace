import { createFileRoute } from "@tanstack/react-router"
import { postSupportUpdate } from "@/domains/support"
import { toHttpResponse } from "@/lib/http"

export const Route = createFileRoute("/api/support/$id/updates")({
    server: {
        handlers: {
            POST: ({ request, params }) =>
                toHttpResponse(async () => {
                    const body = (await request
                        .json()
                        .catch(() => ({}))) as Record<string, unknown>
                    return postSupportUpdate({
                        data: { ...body, ...params } as {
                            id: string
                            kind:
                                | "progress"
                                | "pause_response"
                                | "moderator_note"
                            turnstileToken: string
                        },
                    })
                }),
        },
    },
})
