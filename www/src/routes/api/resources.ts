import { createFileRoute } from "@tanstack/react-router"
import { listResources, submitResource } from "@/domains/resources"
import { toHttpResponse } from "@/lib/http"

export const Route = createFileRoute("/api/resources")({
    server: {
        handlers: {
            GET: ({ request }) =>
                toHttpResponse(() => {
                    const url = new URL(request.url)
                    const params = Object.fromEntries(
                        url.searchParams.entries()
                    )
                    return listResources({
                        data: {
                            ...params,
                            verifiedOnly:
                                params.verifiedOnly === "true"
                                    ? true
                                    : undefined,
                            freeOnly:
                                params.freeOnly === "true"
                                    ? true
                                    : undefined,
                            internationalOnly:
                                params.internationalOnly === "true"
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
                    submitResource({
                        data: await request.json(),
                    })
                ),
        },
    },
})
