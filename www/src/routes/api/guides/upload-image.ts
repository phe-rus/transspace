import { createFileRoute } from "@tanstack/react-router"
import { uploadGuideImage } from "@/domains/guides"
import { toHttpResponse } from "@/lib/http"

// deliberately no Turnstile requirement, unlike every other write
// route in this app (spec 0004-guides Security model): a person
// composing a guide uploads images before ever reaching a final
// submit, and a Turnstile token is single-use
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
