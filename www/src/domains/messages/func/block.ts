import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { userLink } from "@/schemas/user-link"
import { SessionMiddleware } from "@/middleware/require-session"
import { assertNotDecoy } from "@/lib/private-data"
import { assertWriteRateLimit } from "@/lib/rate-limit"
import { parseIdList } from "@/lib/id-list"
import { blockSchema } from "../types"

// a hostile account could otherwise grow one row's JSON without bound
const MAX_BLOCKED = 1000

// spec 0009 AC-5: blocking hides the other person's comments from you.
// The list lives on your own userLink row and is never returned by any
// public read
export const setBlocked = createServerFn({ method: "POST" })
    .middleware([SessionMiddleware])
    .validator(blockSchema)
    .handler(async ({ data, context }) => {
        const { userLinkId } = context
        assertNotDecoy(context)
        await assertWriteRateLimit(userLinkId)

        if (data.targetUserLinkId === userLinkId) {
            throw new Response("You cannot block yourself", { status: 422 })
        }

        const [row] = await db
            .select({ blockedUserIds: userLink.blockedUserIds })
            .from(userLink)
            .where(eq(userLink.id, userLinkId))
        const current = parseIdList(row?.blockedUserIds)

        const next = data.block
            ? [...new Set([...current, data.targetUserLinkId])]
            : current.filter((id) => id !== data.targetUserLinkId)
        if (next.length > MAX_BLOCKED) {
            throw new Response("Block list is full", { status: 422 })
        }

        await db
            .update(userLink)
            .set({ blockedUserIds: JSON.stringify(next) })
            .where(eq(userLink.id, userLinkId))
        return { count: next.length }
    })
