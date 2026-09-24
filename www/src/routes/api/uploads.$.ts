import { createFileRoute } from "@tanstack/react-router"
import { env } from "cloudflare:workers"

// public, unauthenticated read route for serving stored files back out
// (spec 0002 Build plan, task 3) — read access has no auth model in this
// spec, matching R2 objects being addressed only by their unguessable
// storage_prefix key, never the internal user_link id
export const Route = createFileRoute("/api/uploads/$")({
    server: {
        handlers: {
            GET: async ({ params }) => {
                const object = await env.R2.get(
                    params._splat ?? ""
                )
                if (!object) {
                    return new Response("Not found", {
                        status: 404,
                    })
                }
                const headers = new Headers()
                object.writeHttpMetadata(headers)
                headers.set("etag", object.httpEtag)
                return new Response(object.body, { headers })
            },
        },
    },
})
