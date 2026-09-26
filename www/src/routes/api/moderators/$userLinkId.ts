import { createFileRoute } from "@tanstack/react-router"
import { revokeModerator } from "@/domains/moderators"
import { toHttpResponse } from "@/lib/http"

export const Route = createFileRoute(
    "/api/moderators/$userLinkId"
)({
    server: {
        handlers: {
            DELETE: ({ request, params }) =>
                toHttpResponse(async () => {
                    const body = (await request
                        .json()
                        .catch(() => ({}))) as Record<
                        string,
                        unknown
                    >
                    return revokeModerator({
                        // the zod validator on revokeModerator is the
                        // real runtime gate; this cast just satisfies the
                        // wrapper's loosely-typed JSON body
                        data: {
                            ...body,
                            userLinkId: params.userLinkId,
                        } as { userLinkId: string },
                    })
                }),
        },
    },
})
