import { createMiddleware } from "@tanstack/react-start"
import { isModerator } from "@/lib/moderators"
import { getCurrentSession } from "./session"

// checked against the moderators table itself, never any other role
// concept (spec 0002 Security model). Context also carries isDecoy
// (matching SessionMiddleware's shape) so a moderator-only write can
// call assertNotDecoy the same way a private write does (spec
// 0003-resource-directory AC-8): a coerced unlock must never be able to
// publish, reject, grant, or revoke, not just perform an ordinary
// private write.
export const ModeratorMiddleware = createMiddleware().server(
    async ({ next }) => {
        const session = await getCurrentSession()
        if (!session) {
            throw new Response("Unauthorized", {
                status: 401,
            })
        }
        if (!(await isModerator(session.userLinkId))) {
            throw new Response("Forbidden", { status: 403 })
        }
        return next({
            context: {
                userLinkId: session.userLinkId,
                isDecoy: session.isDecoy,
            },
        })
    }
)
