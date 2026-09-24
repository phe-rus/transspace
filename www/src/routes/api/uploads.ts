import { createFileRoute } from "@tanstack/react-router"
import {
    deleteUploads,
    listUploads,
    uploadFile,
} from "@/domains/uploads"
import { toHttpResponse } from "@/lib/http"

export const Route = createFileRoute("/api/uploads")({
    server: {
        handlers: {
            GET: ({ request }) => toHttpResponse(() => {
                    const url = new URL(request.url)
                    const targetUserLinkId =
                        url.searchParams.get(
                            "targetUserLinkId"
                        ) ?? undefined
                    return listUploads({
                        data: { targetUserLinkId },
                    })
                }),
            POST: ({ request }) =>
                toHttpResponse(async () =>
                    uploadFile({
                        data: await request.formData(),
                    })
                ),
            DELETE: ({ request }) =>
                toHttpResponse(async () =>
                    deleteUploads({
                        data: await request.json(),
                    })
                ),
        },
    },
})
