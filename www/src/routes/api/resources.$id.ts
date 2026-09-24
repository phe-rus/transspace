import { createFileRoute } from "@tanstack/react-router"
import { getResource } from "@/domains/resources"
import { toHttpResponse } from "@/lib/http"

export const Route = createFileRoute("/api/resources/$id")({
    server: {
        handlers: {
            GET: ({ params }) =>
                toHttpResponse(() => getResource({ data: params })),
        },
    },
})
