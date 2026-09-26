import { and, eq } from "drizzle-orm"
import { db } from "@/db"
import { message } from "@/schemas/trust"

// server only: imported by the comment report endpoint and by a community
// room's Durable Object, never by the domain's index, so the db chain stays
// out of the client bundle

// a report is a `message` row about something, pointing at the person it
// is about, for moderators to review (spec 0009 AC-4, spec 0010 AC-16).
// One report per person per thing: a repeat returns the first row's id
export async function insertReport(input: {
    contentType: string
    contentId: string
    toUserLinkId: string
    authorUserLinkId: string
    body: string
}): Promise<{ id: string }> {
    const [existing] = await db
        .select({ id: message.id })
        .from(message)
        .where(
            and(
                eq(message.kind, "report"),
                eq(message.contentType, input.contentType),
                eq(message.contentId, input.contentId),
                eq(message.authorUserLinkId, input.authorUserLinkId)
            )
        )
    if (existing) return { id: existing.id }

    const id = crypto.randomUUID()
    await db.insert(message).values({
        id,
        kind: "report",
        contentType: input.contentType,
        contentId: input.contentId,
        toUserLinkId: input.toUserLinkId,
        authorUserLinkId: input.authorUserLinkId,
        body: input.body,
        status: "visible",
        createdAt: new Date(),
    })
    return { id }
}
