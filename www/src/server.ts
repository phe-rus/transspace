import { paraglideMiddleware } from '@collections/server.js'
import handler from "@tanstack/react-start/server-entry"

export default {
    async fetch(
        request: Request,
        env: Env,
        ctx: ExecutionContext
    ) {
        return paraglideMiddleware(request, () => handler.fetch(request, {
            context: {
                // @ts-expect-error @tanstack/react-start doesn't know about the environment variables yet
                env: env,
                waitUntil: ctx.waitUntil.bind(ctx),
                passThroughOnException: ctx.passThroughOnException.bind(ctx)
            }
        }))
    }
}
