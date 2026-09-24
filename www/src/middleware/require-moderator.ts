import { createMiddleware } from "@tanstack/react-start"
import { isModerator } from "@/lib/moderators"
import { getCurrentUserLinkId } from "./session"

// checked against the moderators table itself, never any other role
// concept (spec 0002 Security model)
export const ModeratorMiddleware = createMiddleware().server(
    async ({ next }) => {
        const userLinkId = await getCurrentUserLinkId()
        if (!userLinkId) {
            throw new Response("Unauthorized", {
                status: 401,
            })
        }
        if (!(await isModerator(userLinkId))) {
            throw new Response("Forbidden", { status: 403 })
        }
        return next({ context: { userLinkId } })
    }
)
