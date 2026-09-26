import { createServerFn } from "@tanstack/react-start"
import { queryOptions } from "@tanstack/react-query"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { userLink } from "@/schemas/user-link"
import { SessionMiddleware } from "@/middleware/require-session"
import { assertNotDecoy, readPrivate } from "@/lib/private-data"
import { updateProfileSchema } from "./types"

// the decoy shaped empty profile spec 0001's /profile GET returns for a
// decoy session: generic and empty, never distinguishable in shape from
// a real, freshly onboarded profile (spec 0001 AC-6)
const DECOY_PROFILE = {
    displayName: null as string | null,
    avatarSlug: null as string | null,
    bio: null as string | null,
    pronouns: null as string | null,
    topics: [] as string[],
}

async function loadProfile(userLinkId: string) {
    const [row] = await db
        .select({
            displayName: userLink.displayName,
            avatarSlug: userLink.avatarSlug,
            bio: userLink.bio,
            pronouns: userLink.pronouns,
            topics: userLink.topics,
        })
        .from(userLink)
        .where(eq(userLink.id, userLinkId))
    if (!row) {
        throw new Response("Profile not found", { status: 404 })
    }
    return {
        displayName: row.displayName,
        avatarSlug: row.avatarSlug,
        bio: row.bio,
        pronouns: row.pronouns,
        topics: row.topics
            ? (JSON.parse(row.topics) as string[])
            : [],
    }
}

export const getProfile = createServerFn({ method: "GET" })
    .middleware([SessionMiddleware])
    .handler(async ({ context: { userLinkId, isDecoy } }) =>
        readPrivate(
            { isDecoy },
            () => loadProfile(userLinkId),
            DECOY_PROFILE
        )
    )

export const profileQueryOptions = () =>
    queryOptions({
        queryKey: ["profile"],
        queryFn: () => getProfile(),
    })

// validated manually (not via .validator()) so a bad avatar_slug/topic/
// display name reaches the caller as the 422 spec 0001's API surface
// specifies, not an unhandled parse exception
export const updateProfile = createServerFn({ method: "POST" })
    .middleware([SessionMiddleware])
    .validator((input: unknown) => input)
    .handler(async ({ data, context: { userLinkId, isDecoy } }) => {
        assertNotDecoy({ isDecoy })
        const parsed = updateProfileSchema.safeParse(data)
        if (!parsed.success) {
            throw new Response(parsed.error.message, {
                status: 422,
            })
        }
        const update = parsed.data
        await db
            .update(userLink)
            .set({
                ...(update.displayName !== undefined && {
                    displayName: update.displayName,
                }),
                ...(update.avatarSlug !== undefined && {
                    avatarSlug: update.avatarSlug,
                }),
                ...(update.bio !== undefined && {
                    bio: update.bio,
                }),
                ...(update.pronouns !== undefined && {
                    pronouns: update.pronouns,
                }),
                ...(update.topics !== undefined && {
                    topics: JSON.stringify(update.topics),
                }),
            })
            .where(eq(userLink.id, userLinkId))
        return loadProfile(userLinkId)
    })
