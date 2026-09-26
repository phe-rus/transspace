import { createFileRoute } from "@tanstack/react-router"
import { editSupportPost, getSupportPost } from "@/domains/support"
import { toHttpResponse } from "@/lib/http"

export const Route = createFileRoute("/api/support/$id/")({
    server: {
        handlers: {
            GET: ({ params }) =>
                toHttpResponse(() => getSupportPost({ data: params })),
            PATCH: ({ request, params }) =>
                toHttpResponse(async () => {
                    const body = (await request
                        .json()
                        .catch(() => ({}))) as Record<string, unknown>
                    return editSupportPost({
                        data: { ...body, ...params } as {
                            id: string
                            turnstileToken: string
                        },
                    })
                }),
        },
    },
})
