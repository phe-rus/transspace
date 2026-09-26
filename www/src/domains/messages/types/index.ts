import { z } from "zod"

// what a comment can be attached to (spec 0009 AC-1). Stories and
// community threads are guide rows (specs 0007, 0010), so "guide" covers
// all three kinds
export const COMMENT_CONTENT_TYPES = ["guide", "resource", "supportPost"] as const
export type CommentContentType = (typeof COMMENT_CONTENT_TYPES)[number]

// spec 0009 AC-6: plain text, 1 to 2000 characters
export const COMMENT_MAX_LENGTH = 2000
export const REPORT_REASON_MAX_LENGTH = 500


const contentRef = {
    contentType: z.enum(COMMENT_CONTENT_TYPES),
    contentId: z.string().min(1),
}

export const listCommentsSchema = z.object(contentRef)

export const postCommentSchema = z.object({
    ...contentRef,
    body: z.string().trim().min(1).max(COMMENT_MAX_LENGTH),
    parentId: z.string().min(1).optional(),
})

export const commentIdSchema = z.object({
    id: z.string().min(1),
})

export const reportCommentSchema = z.object({
    id: z.string().min(1),
    reason: z.string().trim().max(REPORT_REASON_MAX_LENGTH).optional(),
})

export const blockSchema = z.object({
    targetUserLinkId: z.string().min(1),
    block: z.boolean(),
})

export type CommentReply = {
    id: string
    // null once removed; used to block the writer (spec 0009 AC-5)
    authorUserLinkId: string | null
    authorName: string
    isMine: boolean
    body: string | null
    removed: boolean
    createdAt: Date
}

export type Comment = CommentReply & {
    replies: CommentReply[]
}
