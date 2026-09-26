import { paraglideMiddleware } from '@/paraglide/server.js'
import handler from "@tanstack/react-start/server-entry"
import { handleRoomRequest, matchRoomPath } from "@/live/room-route"

// Durable Object classes must be exported from the worker entry (spec 0010
// Configuration required)
export { CommunityRoom } from "@/live/community-room"
export { LiveHub } from "@/live/live-hub"

export default {
    async fetch(
        request: Request,
        env: Env,
        ctx: ExecutionContext
    ) {
        // a community room's WebSocket upgrade is answered here, not by
        // TanStack Start, so its 101 response goes back untouched
        const roomSlug = matchRoomPath(new URL(request.url).pathname)
        if (roomSlug) {
            return handleRoomRequest(request, env, roomSlug)
        }

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
