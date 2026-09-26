import { createFileRoute } from "@tanstack/react-router"
import { withdrawClaim } from "@/domains/support"
import { toHttpResponse } from "@/lib/http"

export const Route = createFileRoute(
    "/api/support/$id/claims/$claimId/"
)({
    server: {
        handlers: {
            DELETE: ({ request, params }) =>
                toHttpResponse(async () => {
                    const body = (await request
                        .json()
                        .catch(() => ({}))) as Record<string, unknown>
                    return withdrawClaim({
                        data: { ...body, ...params } as {
                            id: string
                            claimId: string
                        },
                    })
                }),
        },
    },
})
