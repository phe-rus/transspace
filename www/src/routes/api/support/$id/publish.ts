import { createFileRoute } from "@tanstack/react-router"
import { publishSupportPost } from "@/domains/support"
import { toHttpResponse } from "@/lib/http"

export const Route = createFileRoute("/api/support/$id/publish")({
    server: {
        handlers: {
            POST: ({ request, params }) =>
                toHttpResponse(async () => {
                    const body = (await request
                        .json()
                        .catch(() => ({}))) as Record<string, unknown>
                    return publishSupportPost({
                        data: { ...body, ...params } as {
                            id: string
                            turnstileToken: string
                        },
                    })
                }),
        },
    },
})
