import { createFileRoute } from "@tanstack/react-router"
import { declineClaim } from "@/domains/support"
import { toHttpResponse } from "@/lib/http"

export const Route = createFileRoute(
    "/api/support/$id/claims/$claimId/decline"
)({
    server: {
        handlers: {
            POST: ({ request, params }) =>
                toHttpResponse(async () => {
                    const body = (await request
                        .json()
                        .catch(() => ({}))) as Record<string, unknown>
                    return declineClaim({
                        data: { ...body, ...params } as {
                            id: string
                            claimId: string
                        },
                    })
                }),
        },
    },
})
