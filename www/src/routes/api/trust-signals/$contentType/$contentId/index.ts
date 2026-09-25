import { createFileRoute } from "@tanstack/react-router"
import { getTrustSignal } from "@/domains/trust-signals"
import { toHttpResponse } from "@/lib/http"

export const Route = createFileRoute(
    "/api/trust-signals/$contentType/$contentId/"
)({
    server: {
        handlers: {
            GET: ({ params }) =>
                toHttpResponse(() =>
                    getTrustSignal({ data: params })
                ),
        },
    },
})
