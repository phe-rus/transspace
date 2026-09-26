import { createFileRoute } from "@tanstack/react-router"
import { publishGuide } from "@/domains/guides"
import { toHttpResponse } from "@/lib/http"

export const Route = createFileRoute("/api/guides/$id/publish")({
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
                    return publishGuide({
                        // the zod validator on publishGuide is the
                        // real runtime gate; this cast just satisfies
                        // the wrapper's loosely-typed JSON body
                        data: { ...body, ...params } as {
                            id: string
                        },
                    })
                }),
        },
    },
})
