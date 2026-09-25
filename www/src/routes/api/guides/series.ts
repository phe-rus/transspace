import { createFileRoute } from "@tanstack/react-router"
import { listGuideSeries } from "@/domains/guides"
import { toHttpResponse } from "@/lib/http"

export const Route = createFileRoute("/api/guides/series")({
    server: {
        handlers: {
            GET: ({ request }) =>
                toHttpResponse(() => {
                    const url = new URL(request.url)
                    const search = url.searchParams.get("search") ?? undefined
                    return listGuideSeries({ data: { search } })
                }),
        },
    },
})
