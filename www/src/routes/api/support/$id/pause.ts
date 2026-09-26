import { createFileRoute } from "@tanstack/react-router"
import { pauseSupportPost } from "@/domains/support"
import { toHttpResponse } from "@/lib/http"

export const Route = createFileRoute("/api/support/$id/pause")({
    server: {
        handlers: {
            POST: ({ request, params }) =>
                toHttpResponse(async () => {
                    const body = (await request
                        .json()
                        .catch(() => ({}))) as Record<string, unknown>
                    return pauseSupportPost({
                        data: { ...body, ...params } as {
                            id: string
                            reason: string
                        },
                    })
                }),
        },
    },
})
