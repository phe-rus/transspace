import { createServerFn } from "@tanstack/react-start"
import { sql } from "drizzle-orm"
import { db } from "@/db"
import { guide, guideSeries } from "@/schemas/guides"
import { trustSignal } from "@/schemas/trust"
import { SessionMiddleware } from "@/middleware/require-session"
import { assertNotDecoy } from "@/lib/private-data"
import { assertWriteRateLimit } from "@/lib/rate-limit"
import { assertTurnstileVerified } from "@/lib/turnstile"
import {
    analyzeBodyContent,
    assertValidCoverImageUrl,
    assertValidRelatedResourceIds,
    assertValidVideoUrl,
} from "../content-safety"
import { assertValidGuideCategory, submitGuideSchema } from "../types"

// found-or-created against guide_series.title via a case-insensitive
// lookup; insert-if-absent then select, mirrors findOrCreateCountry
// exactly (spec 0003 AC-3, spec 0004 AC-10, Value sourcing). Kept
// module-private and inline here, not exported from a shared file:
// resources' findOrCreateCountry lives the same way, right beside its
// only caller, never through a cross-file export the client bundle
// could reach transitively
async function findOrCreateSeries(title: string): Promise<string> {
    const trimmed = title.trim()
    const existing = await db
        .select({ id: guideSeries.id })
        .from(guideSeries)
        .where(sql`lower(${guideSeries.title}) = lower(${trimmed})`)
    if (existing[0]) return existing[0].id

    await db
        .insert(guideSeries)
        .values({
            id: crypto.randomUUID(),
            title: trimmed,
            createdAt: new Date(),
        })
        .onConflictDoNothing()

    const row = await db
        .select({ id: guideSeries.id })
        .from(guideSeries)
        .where(sql`lower(${guideSeries.title}) = lower(${trimmed})`)
    return row[0]!.id
}

export const submitGuide = createServerFn({ method: "POST" })
    .middleware([SessionMiddleware])
    .validator(submitGuideSchema)
    .handler(async ({ data, context }) => {
        const { userLinkId } = context
        assertNotDecoy(context)
        await assertWriteRateLimit(userLinkId)
        await assertTurnstileVerified(data.turnstileToken)
        assertValidGuideCategory(data.category)

        // validated before anything is written (spec 0004 AC-9, AC-10):
        // image src allowlist + size cap inside analyzeBodyContent, id
        // format + count cap inside assertValidRelatedResourceIds,
        // cover image same-origin rule, video provider allowlist
        const { wordCount, hasLink } = analyzeBodyContent(data.bodyContent)
        const relatedResourceIds = assertValidRelatedResourceIds(
            data.relatedResourceIds
        )
        assertValidCoverImageUrl(data.coverImageUrl)
        assertValidVideoUrl(data.videoUrl)

        // outside the batch below: find-or-create needs its own
        // select/insert/select round trip before the atomic write can
        // be assembled, same reasoning as resources' findOrCreateCountry
        const seriesId = data.seriesTitle
            ? await findOrCreateSeries(data.seriesTitle)
            : null

        // client-supplied (draftGuideId): images were already uploaded
        // under this id before submit ever ran, so the guide row must
        // reuse it rather than getting a fresh one (spec 0004 AC-10
        // follow-up). A duplicate id fails the insert's primary key
        // constraint, the same sane failure mode a double-submit hits
        // anywhere else in this codebase
        const id = data.id
        const now = new Date()

        // guide + its trust_signal are created together, including
        // referencesAvailable computed inline: either both land or
        // neither does (spec 0004 AC-3, Key invariants). Inserts the
        // trust_signal row directly rather than calling the shared
        // createTrustSignal/setReferencesAvailable (both are
        // already-awaited functions, not usable inside a batch of
        // un-executed query builders), same reasoning as resources'
        // submit.
        await db.batch([
            db.insert(guide).values({
                id,
                title: data.title,
                excerpt: data.excerpt,
                category: data.category,
                bodyContent: JSON.stringify(data.bodyContent),
                wordCount,
                relatedResourceIds: relatedResourceIds.length
                    ? JSON.stringify(relatedResourceIds)
                    : null,
                seriesId,
                seriesOrder: data.seriesOrder ?? null,
                coverImageUrl: data.coverImageUrl ?? null,
                videoUrl: data.videoUrl ?? null,
                status: "pending",
                submittedBy: userLinkId,
                createdAt: now,
                updatedAt: now,
            }),
            db.insert(trustSignal).values({
                id: crypto.randomUUID(),
                contentType: "guide",
                contentId: id,
                submittedAt: now,
                submittedBy: userLinkId,
                referencesAvailable: hasLink,
            }),
        ])

        return { id, status: "pending" as const }
    })
