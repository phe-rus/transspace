import { createFileRoute } from "@tanstack/react-router"
import { verifyTrustSignal } from "@/domains/trust-signals"
import { toHttpResponse } from "@/lib/http"

export const Route = createFileRoute(
    "/api/trust-signals/$contentType/$contentId/verify"
)({
    server: {
        handlers: {
            POST: ({ request, params }) =>
                toHttpResponse(async () => {
                    const body = (await request
                        .json()
                        .catch(() => ({}))) as Record<
                            string,
                            unknown
                        >
                    return verifyTrustSignal({
                        data: { ...body, ...params } as {
                            contentType: string
                            contentId: string
                        },
                    })
                }),
        },
    },
})
