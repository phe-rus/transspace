import { createFileRoute } from "@tanstack/react-router"
import { uploadGuideImage } from "@/domains/guides"
import { toHttpResponse } from "@/lib/http"

// session, write rate limit and the per account storage quota guard this
// (spec 0004-guides Security model); Turnstile is only ever on login
export const Route = createFileRoute("/api/guides/upload-image")({
    server: {
        handlers: {
            POST: ({ request }) =>
                toHttpResponse(async () => {
                    // request.formData() throws a plain TypeError (not
                    // a Response) on a missing/wrong Content-Type,
                    // which toHttpResponse doesn't catch; turned into
                    // a clean 400 here instead of an unhandled 500
                    let formData: FormData
                    try {
                        formData = await request.formData()
                    } catch {
                        throw new Response(
                            "Expected multipart/form-data",
                            { status: 400 }
                        )
                    }
                    return uploadGuideImage({ data: formData })
                }),
        },
    },
})
