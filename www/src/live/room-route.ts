import { eq } from "drizzle-orm"
import { db } from "@/db"
import { userLink } from "@/schemas/user-link"
import { isCommunitySlug } from "@/data/communities"
import { sessionFromHeaders } from "@/middleware/session"
import { assertReadRateLimit } from "@/lib/rate-limit"
import {
    ROOM_NAME_HEADER,
    ROOM_SLUG_HEADER,
    ROOM_USER_HEADER,
} from "./community-room"

const ROOM_PATH = /^\/api\/communities\/([^/]+)\/room$/

// the slug when the request is a room connection, else null
export function matchRoomPath(pathname: string): string | null {
    return ROOM_PATH.exec(pathname)?.[1] ?? null
}

function refuse(status: number, text: string): Response {
    return new Response(text, { status })
}

// GET /api/communities/$slug/room, a WebSocket upgrade (spec 0010 API
// surface). Answered by the worker entry itself, before TanStack Start,
// so the upgrade response reaches the browser untouched. The room trusts
// only what this function passes it (spec 0010 Key invariants)
export async function handleRoomRequest(
    request: Request,
    env: Env,
    slug: string
): Promise<Response> {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
        return refuse(426, "Expected a WebSocket upgrade")
    }
    // a browser sends its cookies with a WebSocket handshake from any
    // site, so only a page on this site may open a room connection
    const origin = request.headers.get("Origin")
    if (!origin || new URL(origin).host !== new URL(request.url).host) {
        return refuse(403, "Forbidden")
    }
    if (!isCommunitySlug(slug)) {
        return refuse(404, "Not found")
    }

    const session = await sessionFromHeaders(request.headers)
    if (!session) return refuse(401, "Unauthorized")
    // a decoy session reads communities but never enters a live room
    // (spec 0010 AC-17)
    if (session.isDecoy) return refuse(403, "Forbidden")
    try {
        await assertReadRateLimit(session.userLinkId)
    } catch (error) {
        if (error instanceof Response) return error
        throw error
    }

    // named columns only (spec 0008 AC-5)
    const [person] = await db
        .select({
            displayName: userLink.displayName,
            deletedAt: userLink.deletedAt,
            pinHash: userLink.pinHash,
        })
        .from(userLink)
        .where(eq(userLink.id, session.userLinkId))
    // chat shows the pseudonymous profile name, so a person needs one
    if (!person || person.deletedAt || !person.displayName) {
        return refuse(403, "Forbidden")
    }
    // the same app lock rule the page guards use
    const unlocked = Boolean(
        session.unlockedUntil && session.unlockedUntil.getTime() > Date.now()
    )
    if (person.pinHash && !unlocked) return refuse(403, "Forbidden")

    const room = env.COMMUNITY_ROOM.get(env.COMMUNITY_ROOM.idFromName(slug))
    return room.fetch(
        new Request("https://community-room/connect", {
            headers: {
                Upgrade: "websocket",
                [ROOM_USER_HEADER]: session.userLinkId,
                // header values must be plain ASCII; names may not be
                [ROOM_NAME_HEADER]: encodeURIComponent(person.displayName),
                [ROOM_SLUG_HEADER]: slug,
            },
        })
    )
}
