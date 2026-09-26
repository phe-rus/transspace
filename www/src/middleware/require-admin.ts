import { createMiddleware } from "@tanstack/react-start"
import { isAdmin } from "@/lib/admins"
import { getCurrentSession } from "./session"

// any admin (including a super admin): full privileges everywhere a
// moderator has them, plus admin-exclusive capabilities like managing
// moderators and granting/revoking plain 'admin' status. Managing the
// super admin roster itself is narrower, see FounderMiddleware.
export const AdminMiddleware = createMiddleware().server(
    async ({ next }) => {
        const session = await getCurrentSession()
        if (!session) {
            throw new Response("Unauthorized", { status: 401 })
        }
        if (!(await isAdmin(session.userLinkId))) {
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
