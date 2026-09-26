import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { supportPost } from "@/schemas/support"
import { SessionMiddleware } from "@/middleware/require-session"
import { ModeratorMiddleware } from "@/middleware/require-moderator"
import { assertNotDecoy } from "@/lib/private-data"
import { coSignTrustSignal, verifyTrustSignal } from "@/domains/trust-signals"
import { coSignSupportPostSchema, verifySupportPostSchema } from "../types"
import { assertSelfReviewAllowed } from "./shared"

// spec 0005 AC-18/H1: the generic trust-signals cosign/verify endpoints
// carry no tier awareness, so a support post's cosign/verify path is
// wrapped here with its own visibility check in front, rather than
// exposed directly. A signed-in caller sees full detail on any tier once
// a post is published (spec 0005 AC-4), so the only gate a signed-in
// wrapper caller needs is "is it actually published".
async function assertPublishedSupportPost(id: string): Promise<void> {
    const [row] = await db
        .select({ status: supportPost.status })
        .from(supportPost)
        .where(eq(supportPost.id, id))
    if (!row || row.status !== "published") {
        throw new Response("Not found", { status: 404 })
    }
}

export const coSignSupportPost = createServerFn({ method: "POST" })
    .middleware([SessionMiddleware])
    .validator(coSignSupportPostSchema)
    .handler(async ({ data, context }) => {
        assertNotDecoy(context)
        await assertPublishedSupportPost(data.id)
        return coSignTrustSignal({
            data: {
                contentType: "supportPost",
                contentId: data.id,
            },
        })
    })

export const verifySupportPost = createServerFn({ method: "POST" })
    .middleware([ModeratorMiddleware])
    .validator(verifySupportPostSchema)
    .handler(async ({ data, context }) => {
        const { userLinkId } = context
        assertNotDecoy(context)

        const [post] = await db
            .select({ authorUserLinkId: supportPost.authorUserLinkId })
            .from(supportPost)
            .where(eq(supportPost.id, data.id))
        if (!post) {
            throw new Response("Not found", { status: 404 })
        }
        await assertSelfReviewAllowed(userLinkId, post.authorUserLinkId)

        return verifyTrustSignal({
            data: {
                contentType: "supportPost",
                contentId: data.id,
            },
        })
    })
