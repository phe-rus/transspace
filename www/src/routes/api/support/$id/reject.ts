import { createFileRoute } from "@tanstack/react-router"
import { rejectSupportPost } from "@/domains/support"
import { toHttpResponse } from "@/lib/http"

export const Route = createFileRoute("/api/support/$id/reject")({
    server: {
        handlers: {
            POST: ({ request, params }) =>
                toHttpResponse(async () => {
                    const body = (await request
                        .json()
                        .catch(() => ({}))) as Record<string, unknown>
                    return rejectSupportPost({
                        data: { ...body, ...params } as {
                            id: string
                            reason: string
                            turnstileToken: string
                        },
                    })
                }),
        },
    },
})
