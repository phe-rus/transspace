import { createServerFn } from "@tanstack/react-start"
import { and, eq, inArray } from "drizzle-orm"
import { db } from "@/db"
import { supportPost } from "@/schemas/support"
import { SessionMiddleware } from "@/middleware/require-session"
import { assertNotDecoy } from "@/lib/private-data"
import { assertWriteRateLimit } from "@/lib/rate-limit"
import { userLink } from "@/schemas/user-link"
import {
    directionForType,
    OPEN_SUPPORT_POST_STATUSES,
} from "@/data/support-types"
import {
    assertValidSupportType,
    parseStructuredDetails,
    submitSupportPostSchema,
} from "../types"

// spec 0005 AC-6: cuts off the most common scam pattern (a brand new
// account, an immediate money ask) without meaningfully delaying a
// genuine long time community member
const FINANCIAL_ACCOUNT_AGE_MS = 7 * 24 * 60 * 60 * 1000

export const submitSupportPost = createServerFn({ method: "POST" })
    .middleware([SessionMiddleware])
    .validator(submitSupportPostSchema)
    .handler(async ({ data, context }) => {
        const { userLinkId } = context
        assertNotDecoy(context)
        await assertWriteRateLimit(userLinkId)
        assertValidSupportType(data.type)

        const direction = directionForType(data.type)
        // spec 0005 AC-2/M8: isUrgent only ever applies to a request
        if (data.isUrgent && direction !== "request") {
            throw new Response(
                "isUrgent only applies to a request",
                { status: 422 }
            )
        }
        // spec 0005 AC-20: isRecurring (a standing offer) only ever
        // applies to an offer
        if (data.isRecurring && direction !== "offer") {
            throw new Response(
                "isRecurring only applies to an offer",
                { status: 422 }
            )
        }

        const structuredDetails = parseStructuredDetails(
            data.type,
            data.structuredDetails
        )

        if (data.type === "request_financial") {
            const [account] = await db
                .select({ createdAt: userLink.createdAt })
                .from(userLink)
                .where(eq(userLink.id, userLinkId))
            if (
                !account ||
                Date.now() - account.createdAt.getTime() <
                    FINANCIAL_ACCOUNT_AGE_MS
            ) {
                throw new Response(
                    "Account too new to post a financial request",
                    { status: 403 }
                )
            }
            await assertNoOpenFinancialRequest(userLinkId)
        }

        const id = crypto.randomUUID()
        const now = new Date()

        try {
            await db.insert(supportPost).values({
                id,
                type: data.type,
                direction,
                isUrgent: data.isUrgent ?? false,
                isRecurring: data.isRecurring ?? false,
                title: data.title,
                visibilityTier: data.visibilityTier,
                status: "pending",
                authorUserLinkId: userLinkId,
                requestorCountryCode: data.requestorCountryCode,
                structuredDetails: JSON.stringify(structuredDetails),
                createdAt: now,
                updatedAt: now,
            })
        } catch (error) {
            // the partial unique index (spec 0005 AC-7, key invariants)
            // is the real atomic guarantee against a race between two
            // simultaneous submissions; this only translates that
            // failure into the spec's 409, it never re-derives the rule
            if (
                data.type === "request_financial" &&
                error instanceof Error &&
                error.message.includes("UNIQUE")
            ) {
                throw new Response(
                    "You already have an open financial request",
                    { status: 409 }
                )
            }
            throw error
        }

        return { id, status: "pending" as const }
    })

async function assertNoOpenFinancialRequest(
    userLinkId: string
): Promise<void> {
    const [existing] = await db
        .select({ id: supportPost.id })
        .from(supportPost)
        .where(
            and(
                eq(supportPost.authorUserLinkId, userLinkId),
                eq(supportPost.type, "request_financial"),
                inArray(supportPost.status, OPEN_SUPPORT_POST_STATUSES)
            )
        )
    if (existing) {
        throw new Response(
            "You already have an open financial request",
            { status: 409 }
        )
    }
}
