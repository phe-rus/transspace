import { createFileRoute } from "@tanstack/react-router"
import { listSupportPosts, submitSupportPost } from "@/domains/support"
import { toHttpResponse } from "@/lib/http"

export const Route = createFileRoute("/api/support/")({
    server: {
        handlers: {
            GET: ({ request }) =>
                toHttpResponse(() => {
                    const url = new URL(request.url)
                    const params = Object.fromEntries(
                        url.searchParams.entries()
                    )
                    return listSupportPosts({
                        data: {
                            ...params,
                            mine: params.mine === "true" ? true : undefined,
                            includeFulfilled:
                                params.includeFulfilled === "true"
                                    ? true
                                    : undefined,
                            limit: params.limit
                                ? Number(params.limit)
                                : undefined,
                        },
                    })
                }),
            POST: ({ request }) =>
                toHttpResponse(async () =>
                    submitSupportPost({
                        data: await request.json(),
                    })
                ),
        },
    },
})
