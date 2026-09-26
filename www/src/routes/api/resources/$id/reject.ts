import { createFileRoute } from "@tanstack/react-router"
import { rejectResource } from "@/domains/resources"
import { toHttpResponse } from "@/lib/http"

export const Route = createFileRoute("/api/resources/$id/reject")({
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
                    return rejectResource({
                        // the zod validator on rejectResource is the
                        // real runtime gate; this cast just satisfies the
                        // wrapper's loosely-typed JSON body
                        data: { ...body, ...params } as {
                            id: string
                        },
                    })
                }),
        },
    },
})
