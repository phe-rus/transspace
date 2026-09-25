import { createFileRoute } from "@tanstack/react-router"
import { listGuides, submitGuide } from "@/domains/guides"
import { toHttpResponse } from "@/lib/http"

export const Route = createFileRoute("/api/guides/")({
    server: {
        handlers: {
            GET: ({ request }) =>
                toHttpResponse(() => {
                    const url = new URL(request.url)
                    const params = Object.fromEntries(
                        url.searchParams.entries()
                    )
                    return listGuides({
                        data: {
                            ...params,
                            limit: params.limit
                                ? Number(params.limit)
                                : undefined,
                        },
                    })
                }),
            POST: ({ request }) =>
                toHttpResponse(async () =>
                    submitGuide({
                        data: await request.json(),
                    })
                ),
        },
    },
})
