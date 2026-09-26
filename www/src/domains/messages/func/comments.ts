import { createServerFn } from "@tanstack/react-start"
import { queryOptions } from "@tanstack/react-query"
import { and, asc, eq } from "drizzle-orm"
import { db } from "@/db"
import { guide } from "@/schemas/guides"
import { resource } from "@/schemas/resources"
import { supportPost } from "@/schemas/support"
import { message } from "@/schemas/trust"
import { userLink } from "@/schemas/user-link"
import { SessionMiddleware } from "@/middleware/require-session"
import { assertNotDecoy } from "@/lib/private-data"
import { assertReadRateLimit, assertWriteRateLimit } from "@/lib/rate-limit"
import { isModerator } from "@/lib/moderators"
import { logModerationAction } from "@/lib/moderation-audit"
import { parseIdList } from "@/lib/id-list"
import { insertReport } from "../reports"
import { FALLBACK_BYLINE } from "@/domains/guides/func/shared"
import {
    commentIdSchema,
    listCommentsSchema,
    postCommentSchema,
    reportCommentSchema,
    type Comment,
    type CommentContentType,
    type CommentReply,
} from "../types"

// a thread's list is small in practice; the cap keeps one read bounded
// until comments need real paging
const MAX_COMMENTS = 500

// spec 0009 AC-7: comments only exist on published content the reader may
// read, and a private mutual aid post has none. Also says whether the
// content is a community thread, whose last activity a reply moves (spec
// 0010 AC-8). Not exported, so the db chain stays out of the client bundle
async function assertCommentable(
    contentType: CommentContentType,
    contentId: string
): Promise<{ isThread: boolean }> {
    let open = false
    let isThread = false
    if (contentType === "guide") {
        const [row] = await db
            .select({ status: guide.status, kind: guide.kind })
            .from(guide)
            .where(eq(guide.id, contentId))
        open = row?.status === "published"
        isThread = row?.kind === "thread"
    } else if (contentType === "resource") {
        const [row] = await db
            .select({ status: resource.status })
            .from(resource)
            .where(eq(resource.id, contentId))
        open = row?.status === "published"
    } else {
        const [row] = await db
            .select({
                status: supportPost.status,
                visibilityTier: supportPost.visibilityTier,
            })
            .from(supportPost)
            .where(eq(supportPost.id, contentId))
        open = row?.status === "published" && row.visibilityTier !== "private"
    }
    if (!open) {
        throw new Response("Not found", { status: 404 })
    }
    return { isThread }
}

async function blockedIdsOf(userLinkId: string): Promise<Set<string>> {
    const [row] = await db
        .select({ blockedUserIds: userLink.blockedUserIds })
        .from(userLink)
        .where(eq(userLink.id, userLinkId))
    return new Set(parseIdList(row?.blockedUserIds ?? null))
}

async function loadCommentOrThrow(id: string) {
    const [row] = await db
        .select({
            id: message.id,
            authorUserLinkId: message.authorUserLinkId,
            status: message.status,
            contentType: message.contentType,
            contentId: message.contentId,
        })
        .from(message)
        .where(and(eq(message.id, id), eq(message.kind, "comment")))
    if (!row) {
        throw new Response("Not found", { status: 404 })
    }
    return row
}

export const listCommentsQueryOptions = (
    contentType: CommentContentType,
    contentId: string
) =>
    queryOptions({
        queryKey: ["comments", contentType, contentId],
        queryFn: () => listComments({ data: { contentType, contentId } }),
    })

// spec 0009 AC-2, AC-3, AC-5: signed in readers only (a decoy session may
// read), the writer's pseudonymous name only, removed text never returned,
// and nothing from people the reader blocked
export const listComments = createServerFn({ method: "GET" })
    .middleware([SessionMiddleware])
    .validator(listCommentsSchema)
    .handler(async ({ data, context: { userLinkId } }): Promise<Comment[]> => {
        await assertReadRateLimit(userLinkId)
        await assertCommentable(data.contentType, data.contentId)
        const blocked = await blockedIdsOf(userLinkId)

        const rows = await db
            .select({
                id: message.id,
                authorUserLinkId: message.authorUserLinkId,
                parentId: message.parentId,
                body: message.body,
                status: message.status,
                createdAt: message.createdAt,
                displayName: userLink.displayName,
                deletedAt: userLink.deletedAt,
            })
            .from(message)
            .leftJoin(userLink, eq(userLink.id, message.authorUserLinkId))
            .where(
                and(
                    eq(message.kind, "comment"),
                    eq(message.contentType, data.contentType),
                    eq(message.contentId, data.contentId)
                )
            )
            .orderBy(asc(message.createdAt))
            .limit(MAX_COMMENTS)

        const toReply = (row: (typeof rows)[number]): CommentReply => {
            const removed = row.status === "removed"
            return {
                id: row.id,
                authorUserLinkId: removed ? null : row.authorUserLinkId,
                authorName:
                    row.deletedAt || !row.displayName
                        ? FALLBACK_BYLINE
                        : row.displayName,
                isMine: row.authorUserLinkId === userLinkId,
                body: removed ? null : row.body,
                removed,
                createdAt: row.createdAt,
            }
        }

        const visible = rows.filter((row) => !blocked.has(row.authorUserLinkId))
        const byParent = new Map<string, CommentReply[]>()
        for (const row of visible) {
            if (!row.parentId) continue
            const list = byParent.get(row.parentId) ?? []
            list.push(toReply(row))
            byParent.set(row.parentId, list)
        }

        return visible
            .filter((row) => !row.parentId)
            .map((row) => ({ ...toReply(row), replies: byParent.get(row.id) ?? [] }))
            // a removed comment with no replies left under it says nothing
            .filter((comment) => !comment.removed || comment.replies.length > 0)
    })

// spec 0009 AC-1, AC-6: signed in, not a decoy session, and the
// write rate limit; a reply's parent must be a top level comment on the
// same content (one level deep)
export const postComment = createServerFn({ method: "POST" })
    .middleware([SessionMiddleware])
    .validator(postCommentSchema)
    .handler(async ({ data, context }) => {
        const { userLinkId } = context
        assertNotDecoy(context)
        await assertWriteRateLimit(userLinkId)
        const { isThread } = await assertCommentable(
            data.contentType,
            data.contentId
        )

        if (data.parentId) {
            const [parent] = await db
                .select({
                    parentId: message.parentId,
                    contentType: message.contentType,
                    contentId: message.contentId,
                    status: message.status,
                })
                .from(message)
                .where(and(eq(message.id, data.parentId), eq(message.kind, "comment")))
            if (
                !parent ||
                parent.parentId ||
                parent.status === "removed" ||
                parent.contentType !== data.contentType ||
                parent.contentId !== data.contentId
            ) {
                throw new Response("You can only reply to a comment here", {
                    status: 422,
                })
            }
        }

        const id = crypto.randomUUID()
        const createdAt = new Date()
        const insert = db.insert(message).values({
            id,
            kind: "comment",
            contentType: data.contentType,
            contentId: data.contentId,
            authorUserLinkId: userLinkId,
            parentId: data.parentId ?? null,
            body: data.body,
            status: "visible",
            createdAt,
        })
        // a reply on a community thread moves it up its list and the home
        // feed, in the same batch so the two never disagree (spec 0010 AC-8)
        if (isThread) {
            await db.batch([
                insert,
                db
                    .update(guide)
                    .set({ lastActivityAt: createdAt })
                    .where(eq(guide.id, data.contentId)),
            ])
        } else {
            await insert
        }
        return { id }
    })

// spec 0009 AC-3: the writer or any moderator; a moderator's removal of
// someone else's comment is logged like every moderator action
export const deleteComment = createServerFn({ method: "POST" })
    .middleware([SessionMiddleware])
    .validator(commentIdSchema)
    .handler(async ({ data, context }) => {
        const { userLinkId } = context
        assertNotDecoy(context)
        await assertWriteRateLimit(userLinkId)

        const comment = await loadCommentOrThrow(data.id)
        const isAuthor = comment.authorUserLinkId === userLinkId
        if (!isAuthor && !(await isModerator(userLinkId))) {
            throw new Response("Forbidden", { status: 403 })
        }

        await db
            .update(message)
            .set({ status: "removed" })
            .where(eq(message.id, data.id))
        if (!isAuthor) {
            await logModerationAction({
                actorUserLinkId: userLinkId,
                action: "comment.remove",
                target: data.id,
            })
        }
        return { id: data.id }
    })

// spec 0009 AC-4: stored as a `report` row about the comment, pointing at
// its writer, for moderators to review. One report per person per comment
export const reportComment = createServerFn({ method: "POST" })
    .middleware([SessionMiddleware])
    .validator(reportCommentSchema)
    .handler(async ({ data, context }) => {
        const { userLinkId } = context
        assertNotDecoy(context)
        await assertWriteRateLimit(userLinkId)

        const comment = await loadCommentOrThrow(data.id)
        return insertReport({
            contentType: "comment",
            contentId: comment.id,
            toUserLinkId: comment.authorUserLinkId,
            authorUserLinkId: userLinkId,
            body: data.reason ?? "",
        })
    })
