import { createServerFn } from "@tanstack/react-start"
import { queryOptions } from "@tanstack/react-query"
import { desc, eq } from "drizzle-orm"
import { db } from "@/db"
import { supportPost, supportUpdate } from "@/schemas/support"
import { getCurrentSession } from "@/middleware/session"
import { assertReadRateLimit } from "@/lib/rate-limit"
import { readTrustSignal } from "@/domains/trust-signals"
import { isModerator as checkIsModerator } from "@/lib/moderators"
import type {
    SupportPostStatus,
    SupportVisibilityTier,
} from "@/data/support-types"
import { getSupportPostSchema } from "../types"
import {
    currentModeratorId,
    getClientKey,
    getVisitorCountryCode,
    isStatusPubliclyReadable,
    resolveContentVisibility,
} from "./shared"

type SupportPostRow = {
    id: string
    type: string
    direction: string
    isUrgent: boolean
    isRecurring: boolean
    title: string
    visibilityTier: string
    status: string
    authorUserLinkId: string
    requestorCountryCode: string | null
    structuredDetails: string
    moderatedBy: string | null
    moderatedAt: Date | null
    createdAt: Date
    updatedAt: Date
}

// the fields a redacted (sensitive/critical) view exposes: enough to know
// a post exists and roughly what kind, nothing about the author, no
// amounts, no counts (spec 0005 AC-4, H11)
function redactedView(row: SupportPostRow) {
    return {
        visibility: "redacted" as const,
        id: row.id,
        type: row.type,
        direction: row.direction,
        isUrgent: row.isUrgent,
        isRecurring: row.isRecurring,
        title: row.title,
        createdAt: row.createdAt,
    }
}

// spec 0005 AC-11: the displayed raised amount is the most recent
// progress update's amount (a cumulative total, not a delta); visible to
// anyone who can see the post at all, not just the author/moderator
async function latestProgressAmount(
    supportPostId: string
): Promise<number | null> {
    const [latest] = await db
        .select({ amount: supportUpdate.amount })
        .from(supportUpdate)
        .where(eq(supportUpdate.supportPostId, supportPostId))
        .orderBy(desc(supportUpdate.createdAt))
        .limit(1)
    return latest?.amount ?? null
}

// the full moderation/self-report history (pause reasons, rejection
// reasons, moderator notes); author/moderator only, never part of the
// public projection
async function recentUpdates(supportPostId: string) {
    return db
        .select()
        .from(supportUpdate)
        .where(eq(supportUpdate.supportPostId, supportPostId))
        .orderBy(desc(supportUpdate.createdAt))
        .limit(20)
}

async function fullView(
    row: SupportPostRow,
    opts: { includeHistory: boolean; viewerIsSignedIn: boolean }
) {
    const [trust, raisedAmount, updates, authorIsModerator] =
        await Promise.all([
            readTrustSignal("supportPost", row.id),
            latestProgressAmount(row.id),
            opts.includeHistory
                ? recentUpdates(row.id)
                : Promise.resolve(null),
            // spec 0005 AC-17: shown to signed-in viewers only, never
            // exposed to a signed-out visitor
            opts.viewerIsSignedIn
                ? checkIsModerator(row.authorUserLinkId)
                : Promise.resolve(false),
        ])
    return {
        visibility: "full" as const,
        ...row,
        structuredDetails: JSON.parse(row.structuredDetails),
        trust,
        raisedAmount,
        updates,
        authorIsModerator,
    }
}

export const getSupportPostQueryOptions = (id: string) =>
    queryOptions({
        queryKey: ["support-post", id],
        // a 404 Response can't be serialized into the SSR dehydrated
        // query cache; resolving to null keeps not-found a normal
        // successful query result instead of a query error (matches
        // getResourceQueryOptions' same workaround)
        queryFn: async () => {
            try {
                return await getSupportPost({ data: { id } })
            } catch (error) {
                if (error instanceof Response) return null
                throw error
            }
        },
    })

export const getSupportPost = createServerFn({ method: "GET" })
    .validator(getSupportPostSchema)
    .handler(async ({ data }) => {
        await assertReadRateLimit(getClientKey())

        const [row] = await db
            .select()
            .from(supportPost)
            .where(eq(supportPost.id, data.id))
        if (!row) {
            throw new Response("Not found", { status: 404 })
        }

        const session = await getCurrentSession()
        const isSignedIn = Boolean(session)
        const isAuthor = session?.userLinkId === row.authorUserLinkId
        const moderatorId = await currentModeratorId()
        const isModerator = Boolean(moderatorId)

        if (
            !isAuthor &&
            !isModerator &&
            !isStatusPubliclyReadable(
                row.status as SupportPostStatus,
                { isDirectLookup: true }
            )
        ) {
            throw new Response("Not found", { status: 404 })
        }

        if (isAuthor || isModerator) {
            return fullView(row, { includeHistory: true, viewerIsSignedIn: isSignedIn })
        }

        if (row.visibilityTier === "private") {
            if (!isSignedIn) {
                throw new Response("Not found", { status: 404 })
            }
            return fullView(row, { includeHistory: false, viewerIsSignedIn: isSignedIn })
        }

        const countryCode = isSignedIn ? null : getVisitorCountryCode()
        const tier = row.visibilityTier as Exclude<
            SupportVisibilityTier,
            "private"
        >
        const contentVisibility = resolveContentVisibility(tier, {
            isSignedIn,
            countryCode,
        })

        if (contentVisibility === "locked") {
            return { visibility: "locked" as const, id: row.id }
        }
        if (contentVisibility === "redacted") {
            return redactedView(row)
        }

        return fullView(row, { includeHistory: false, viewerIsSignedIn: isSignedIn })
    })
