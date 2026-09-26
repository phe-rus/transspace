import { createServerFn } from "@tanstack/react-start"
import { env } from "cloudflare:workers"
import { isCommunitySlug } from "@/data/communities"
import { ModeratorMiddleware } from "@/middleware/require-moderator"
import { SessionMiddleware } from "@/middleware/require-session"
import { assertNotDecoy } from "@/lib/private-data"
import { assertWriteRateLimit } from "@/lib/rate-limit"
import { logModerationAction } from "@/lib/moderation-audit"
import { roomSlugSchema, setRoomRetentionSchema } from "../types"

// spec 0010 AC-12: a moderator sets how long a community's chat is kept.
// The room stores it and deletes anything older right away
export const setRoomRetention = createServerFn({ method: "POST" })
    .middleware([ModeratorMiddleware])
    .validator(setRoomRetentionSchema)
    .handler(async ({ data, context }) => {
        const { userLinkId } = context
        assertNotDecoy(context)
        await assertWriteRateLimit(userLinkId)
        if (!isCommunitySlug(data.slug)) {
            throw new Response("Unknown community", { status: 422 })
        }

        const room = env.COMMUNITY_ROOM.get(
            env.COMMUNITY_ROOM.idFromName(data.slug)
        )
        const hours = await room.setRetention(data.hours)
        await logModerationAction({
            actorUserLinkId: userLinkId,
            action: "room.retention",
            target: `${data.slug}:${hours}`,
        })
        return { hours }
    })

const TURN_TTL_SECONDS = 60 * 60

type IceServer = { urls: string | string[]; username?: string; credential?: string }

// the TURN key is a Worker secret (spec 0010 Configuration required). Read
// through a narrow type: until it is created, voice answers 503 instead of
// the build failing
function turnKey(): { id: string; token: string } | null {
    const vars = env as unknown as {
        CF_TURN_KEY_ID?: string
        CF_TURN_KEY_API_TOKEN?: string
    }
    return vars.CF_TURN_KEY_ID && vars.CF_TURN_KEY_API_TOKEN
        ? { id: vars.CF_TURN_KEY_ID, token: vars.CF_TURN_KEY_API_TOKEN }
        : null
}

// keeps relay (turn: and turns:) addresses only, so the browser is never
// handed anything that allows a direct connection, and drops port 53,
// which browsers block (spec 0010 Key invariants)
function relayOnly(servers: IceServer[]): IceServer[] {
    return servers
        .map((server) => ({
            ...server,
            urls: (Array.isArray(server.urls) ? server.urls : [server.urls]).filter(
                (url) => /^turns?:/.test(url) && !/:53(\?|$)/.test(url)
            ),
        }))
        .filter((server) => server.urls.length > 0 && server.username)
}

// spec 0010 AC-14: short lived relay credentials, only for a person who
// holds a seat in that room's voice. The seat is asked of the room itself,
// never D1
export const getTurnCredentials = createServerFn({ method: "POST" })
    .middleware([SessionMiddleware])
    .validator(roomSlugSchema)
    .handler(async ({ data, context }) => {
        const { userLinkId } = context
        assertNotDecoy(context)
        await assertWriteRateLimit(userLinkId)
        if (!isCommunitySlug(data.slug)) {
            throw new Response("Unknown community", { status: 422 })
        }

        const room = env.COMMUNITY_ROOM.get(
            env.COMMUNITY_ROOM.idFromName(data.slug)
        )
        if (!(await room.hasSeat(userLinkId))) {
            throw new Response("Forbidden", { status: 403 })
        }
        // near the free plan's daily limit, voice pauses (spec 0010 AC-18)
        const hub = env.LIVE_HUB.get(env.LIVE_HUB.idFromName("global"))
        if ((await hub.mode()) !== "normal") {
            throw new Response("Voice is paused for today", { status: 503 })
        }
        const key = turnKey()
        if (!key) {
            throw new Response("Voice is not set up", { status: 503 })
        }

        const response = await fetch(
            `https://rtc.live.cloudflare.com/v1/turn/keys/${key.id}/credentials/generate-ice-servers`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${key.token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ ttl: TURN_TTL_SECONDS }),
            }
        )
        if (!response.ok) {
            throw new Response("Voice is unavailable", { status: 503 })
        }
        const body = (await response.json()) as {
            iceServers?: IceServer | IceServer[]
        }
        const servers = body.iceServers
            ? Array.isArray(body.iceServers)
                ? body.iceServers
                : [body.iceServers]
            : []
        const iceServers = relayOnly(servers)
        if (!iceServers.length) {
            throw new Response("Voice is unavailable", { status: 503 })
        }
        return { iceServers, ttl: TURN_TTL_SECONDS }
    })
