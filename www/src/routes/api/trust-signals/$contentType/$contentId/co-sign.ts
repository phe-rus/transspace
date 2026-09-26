import { createFileRoute } from "@tanstack/react-router"
import { coSignTrustSignal } from "@/domains/trust-signals"
import { toHttpResponse } from "@/lib/http"

export const Route = createFileRoute(
    "/api/trust-signals/$contentType/$contentId/co-sign"
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
                    return coSignTrustSignal({
                        // the zod validator on coSignTrustSignal is the
                        // real runtime gate; this cast just satisfies the
                        // wrapper's loosely-typed JSON body
                        data: { ...body, ...params } as {
                            contentType: string
                            contentId: string
                        },
                    })
                }),
        },
    },
})
