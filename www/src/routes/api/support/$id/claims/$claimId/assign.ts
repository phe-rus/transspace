import { createFileRoute } from "@tanstack/react-router"
import { assignClaim } from "@/domains/support"
import { toHttpResponse } from "@/lib/http"

export const Route = createFileRoute(
    "/api/support/$id/claims/$claimId/assign"
)({
    server: {
        handlers: {
            POST: ({ request, params }) =>
                toHttpResponse(async () => {
                    const body = (await request
                        .json()
                        .catch(() => ({}))) as Record<string, unknown>
                    return assignClaim({
                        data: { ...body, ...params } as {
                            id: string
                            claimId: string
                            turnstileToken: string
                        },
                    })
                }),
        },
    },
})
