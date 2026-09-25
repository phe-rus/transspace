import { createFileRoute } from "@tanstack/react-router"
import { getGuide } from "@/domains/guides"
import { toHttpResponse } from "@/lib/http"

export const Route = createFileRoute("/api/guides/$id/")({
    server: {
        handlers: {
            GET: ({ params }) =>
                toHttpResponse(() => getGuide({ data: params })),
        },
    },
})
