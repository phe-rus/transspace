import { createMiddleware } from "@tanstack/react-start"
import { isFounder } from "@/lib/admins"
import { getCurrentSession } from "./session"

// only the founder (the very first account, grantedBy null) may promote
// or demote a super admin. Every other admin, including a promoted
// super admin, is rejected here (engineer's explicit call, 2026-09-25)
export const FounderMiddleware = createMiddleware().server(
    async ({ next }) => {
        const session = await getCurrentSession()
        if (!session) {
            throw new Response("Unauthorized", { status: 401 })
        }
        if (!(await isFounder(session.userLinkId))) {
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
