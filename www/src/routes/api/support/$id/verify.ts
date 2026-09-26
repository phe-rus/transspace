import { createFileRoute } from "@tanstack/react-router"
import { verifySupportPost } from "@/domains/support"
import { toHttpResponse } from "@/lib/http"

export const Route = createFileRoute("/api/support/$id/verify")({
    server: {
        handlers: {
            POST: ({ request, params }) =>
                toHttpResponse(async () => {
                    const body = (await request
                        .json()
                        .catch(() => ({}))) as Record<string, unknown>
                    return verifySupportPost({
                        data: { ...body, ...params } as {
                            id: string
                            turnstileToken: string
                        },
                    })
                }),
        },
    },
})
