import { createFileRoute } from "@tanstack/react-router"
import { publishResource } from "@/domains/resources"
import { toHttpResponse } from "@/lib/http"

export const Route = createFileRoute("/api/resources/$id/publish")({
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
                    return publishResource({
                        // the zod validator on publishResource is the
                        // real runtime gate; this cast just satisfies the
                        // wrapper's loosely-typed JSON body
                        data: { ...body, ...params } as {
                            id: string
                            turnstileToken: string
                        },
                    })
                }),
        },
    },
})
