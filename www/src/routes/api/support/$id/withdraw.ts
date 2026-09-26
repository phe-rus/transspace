import { createFileRoute } from "@tanstack/react-router"
import { withdrawSupportPost } from "@/domains/support"
import { toHttpResponse } from "@/lib/http"

export const Route = createFileRoute("/api/support/$id/withdraw")({
    server: {
        handlers: {
            POST: ({ request, params }) =>
                toHttpResponse(async () => {
                    const body = (await request
                        .json()
                        .catch(() => ({}))) as Record<string, unknown>
                    return withdrawSupportPost({
                        data: { ...body, ...params } as {
                            id: string
                        },
                    })
                }),
        },
    },
})
