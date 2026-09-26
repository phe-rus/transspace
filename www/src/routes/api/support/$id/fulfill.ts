import { createFileRoute } from "@tanstack/react-router"
import { fulfillSupportPost } from "@/domains/support"
import { toHttpResponse } from "@/lib/http"

export const Route = createFileRoute("/api/support/$id/fulfill")({
    server: {
        handlers: {
            POST: ({ request, params }) =>
                toHttpResponse(async () => {
                    const body = (await request
                        .json()
                        .catch(() => ({}))) as Record<string, unknown>
                    return fulfillSupportPost({
                        data: { ...body, ...params } as {
                            id: string
                        },
                    })
                }),
        },
    },
})
