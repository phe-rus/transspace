import { createFileRoute } from "@tanstack/react-router"
import { escalateTierSupportPost } from "@/domains/support"
import { toHttpResponse } from "@/lib/http"

export const Route = createFileRoute("/api/support/$id/escalate-tier")({
    server: {
        handlers: {
            POST: ({ request, params }) =>
                toHttpResponse(async () => {
                    const body = (await request
                        .json()
                        .catch(() => ({}))) as Record<string, unknown>
                    return escalateTierSupportPost({
                        data: { ...body, ...params } as {
                            id: string
                            visibilityTier:
                                | "public"
                                | "sensitive"
                                | "critical"
                                | "private"
                        },
                    })
                }),
        },
    },
})
